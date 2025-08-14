const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');
const { getEvolutionConfig } = require('../utils/evolutionConfig');


const router = express.Router();
const prisma = new PrismaClient();

// Validações
const instanceValidation = [
  body('name').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('instanceName').isLength({ min: 2 }).withMessage('Nome da instância deve ter pelo menos 2 caracteres'),
  body('description').optional().isLength({ max: 500 }).withMessage('Descrição deve ter no máximo 500 caracteres')
];

// Listar instâncias da organização (sincronizada com Evolution API)
router.get('/', async (req, res) => {
  try {
    logger.info('Requisição para listar instâncias:', {
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      query: req.query,
      userEmail: req.user?.email,
      userRole: req.user?.role
    });

    const { page = 1, limit = 10, status, sync = 'true' } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: req.user.organizationId
    };

    if (status) {
      where.status = status;
    }

    logger.info('Filtros de busca:', where);

    // Buscar instâncias do banco local
    const [localInstancesRaw, total] = await Promise.all([
      prisma.instance.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              conversations: true,
              messages: true
            }
          }
        }
      }),
      prisma.instance.count({ where })
    ]);

    let localInstances = localInstancesRaw;

    logger.info('Instâncias locais encontradas:', {
      count: localInstances.length,
      total
    });

    // Se sync=true, buscar instâncias da Evolution API
    let evolutionInstances = [];
    if (sync === 'true') {
      try {
        logger.info('Tentando sincronizar com Evolution API');
        const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
        
        logger.info('Configuração Evolution:', {
          hasConfig: !!evolutionConfig,
          baseUrl: evolutionConfig?.baseUrl,
          hasApiKey: !!evolutionConfig?.apiKey,
          config: evolutionConfig
        });
        
        if (evolutionConfig) {
          const evolutionResponse = await axios.get(
            `${evolutionConfig.baseUrl}/instance/fetchInstances`,
            {
              headers: {
                'apikey': evolutionConfig.apiKey
              }
            }
          );

          logger.info('Resposta da Evolution API:', {
            status: evolutionResponse.status,
            dataLength: evolutionResponse.data?.length || 0,
            isArray: Array.isArray(evolutionResponse.data),
            data: evolutionResponse.data
          });

          if (evolutionResponse.data && Array.isArray(evolutionResponse.data)) {
            // Filtrar apenas instâncias que não existem no banco local
            const localInstanceNames = localInstances.map(instance => instance.instanceName);
            
                      logger.info('Debug Evolution API:', {
            totalInstances: evolutionResponse.data.length,
            localInstanceNames: localInstanceNames,
            evolutionInstanceNames: evolutionResponse.data.map(i => i.name),
            filteredInstances: evolutionResponse.data.filter(instance => !localInstanceNames.includes(instance.name)).map(i => i.name)
          });
            
            // Atualizar status das instâncias locais baseado na Evolution API
            const updatedLocalInstances = await Promise.all(
              localInstances.map(async (localInstance) => {
                // Procurar a instância correspondente na Evolution API
                const evolutionInstance = evolutionResponse.data.find(
                  evoInstance => evoInstance.name === localInstance.instanceName
                );
                
                if (evolutionInstance) {
                  // Mapear connectionStatus para status interno
                  let newStatus = localInstance.status; // Manter status atual como fallback
                  if (evolutionInstance.connectionStatus === 'open') {
                    newStatus = 'CONNECTED';
                  } else if (evolutionInstance.connectionStatus === 'close') {
                    newStatus = 'DISCONNECTED';
                  } else if (evolutionInstance.connectionStatus === 'connecting') {
                    newStatus = 'CONNECTING';
                  }
                  
                  // Se o status mudou, atualizar no banco
                  if (newStatus !== localInstance.status) {
                    logger.info(`Atualizando status da instância local ${localInstance.instanceName}:`, {
                      oldStatus: localInstance.status,
                      newStatus: newStatus,
                      connectionStatus: evolutionInstance.connectionStatus
                    });
                    
                    await prisma.instance.update({
                      where: { id: localInstance.id },
                      data: { 
                        status: newStatus,
                        updatedAt: new Date()
                      }
                    });
                    
                    // Retornar instância atualizada
                    return {
                      ...localInstance,
                      status: newStatus,
                      connectionStatus: evolutionInstance.connectionStatus,
                      updatedAt: new Date().toISOString()
                    };
                  } else {
                    // Status não mudou, retornar com connectionStatus
                    return {
                      ...localInstance,
                      connectionStatus: evolutionInstance.connectionStatus
                    };
                  }
                } else {
                  // Instância não encontrada na Evolution API, manter como está
                  return localInstance;
                }
              })
            );
            
            // Mapear instâncias da Evolution API que não existem localmente
            const evolutionInstancesWithStatus = evolutionResponse.data
              .filter(instance => !localInstanceNames.includes(instance.name))
              .map((instance) => {
                // Mapear connectionStatus para status interno
                let status = 'UNKNOWN';
                if (instance.connectionStatus === 'open') {
                  status = 'CONNECTED';
                } else if (instance.connectionStatus === 'close') {
                  status = 'DISCONNECTED';
                } else if (instance.connectionStatus === 'connecting') {
                  status = 'CONNECTING';
                }
                
                return {
                  id: `evolution-${instance.name}`,
                  name: instance.name,
                  instanceName: instance.name,
                  description: `Instância da Evolution API - ${instance.name}`,
                  status: status,
                  connectionStatus: instance.connectionStatus, // Incluir o connectionStatus original
                  qrCode: instance.qrcode,

                  webhookEvents: [],
                  settings: instance,
                  organizationId: req.user.organizationId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  _count: {
                    conversations: 0,
                    messages: 0
                  },
                  isFromEvolution: true
                };
              });
            
            // Usar as instâncias locais atualizadas
            localInstances = updatedLocalInstances;
            evolutionInstances = evolutionInstancesWithStatus;
          }
        }
      } catch (evolutionError) {
        logger.warn('Erro ao sincronizar com Evolution API:', evolutionError.message);
        logger.warn('Stack trace:', evolutionError.stack);
        logger.warn('Error details:', {
          name: evolutionError.name,
          code: evolutionError.code,
          response: evolutionError.response?.data,
          status: evolutionError.response?.status,
          headers: evolutionError.response?.headers,
          config: evolutionError.config,
          url: evolutionError.config?.url,
          method: evolutionError.config?.method,
          timeout: evolutionError.config?.timeout,
          baseURL: evolutionError.config?.baseURL
        });
        // Continua sem as instâncias da Evolution API
      }
    }

                logger.info('Instâncias Evolution encontradas:', {
              count: evolutionInstances.length,
              instances: evolutionInstances.map(i => ({
                id: i.id,
                name: i.name,
                status: i.status,
                connectionStatus: i.connectionStatus
              }))
            });

    // Combinar instâncias locais e da Evolution API
    const allInstances = [...localInstances, ...evolutionInstances];

    logger.info('Total de instâncias retornadas:', {
      total: allInstances.length,
      local: localInstances.length,
      evolution: evolutionInstances.length,
      allInstances: allInstances.map(i => ({
        id: i.id,
        name: i.name,
        status: i.status,
        connectionStatus: i.connectionStatus,
        isFromEvolution: i.isFromEvolution
      }))
    });

    // Log da resposta final
    logger.info('Resposta final:', {
      instancesCount: allInstances.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total + evolutionInstances.length,
        pages: Math.ceil((total + evolutionInstances.length) / limit)
      }
    });

    const response = {
      instances: allInstances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total + evolutionInstances.length,
        pages: Math.ceil((total + evolutionInstances.length) / limit)
      }
    };

    logger.info('Enviando resposta:', {
      instancesCount: response.instances.length,
      pagination: response.pagination
    });

    res.json(response);

      } catch (error) {
      logger.error('Erro ao listar instâncias:', error);
      logger.error('Stack trace:', error.stack);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Sincronizar instâncias da Evolution API
router.get('/sync', async (req, res) => {
  try {
    logger.info('Iniciando sincronização com Evolution API');
    
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    logger.info('Configuração Evolution:', { 
      hasConfig: !!evolutionConfig, 
      baseUrl: evolutionConfig?.baseUrl,
      hasApiKey: !!evolutionConfig?.apiKey 
    });
    
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    if (!evolutionConfig.baseUrl || !evolutionConfig.apiKey) {
      return res.status(400).json({ 
        error: 'Configuração da Evolution API incompleta. Verifique Base URL e API Key.' 
      });
    }

    logger.info('Fazendo requisição para Evolution API:', `${evolutionConfig.baseUrl}/instance/fetchInstances`);

    const evolutionResponse = await axios.get(
      `${evolutionConfig.baseUrl}/instance/fetchInstances`,
      {
        headers: {
          'apikey': evolutionConfig.apiKey
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );

    logger.info('Resposta da Evolution API:', {
      status: evolutionResponse.status,
      hasData: !!evolutionResponse.data,
      dataType: typeof evolutionResponse.data,
      isArray: Array.isArray(evolutionResponse.data)
    });

    if (!evolutionResponse.data) {
      return res.status(400).json({ 
        error: 'Resposta vazia da Evolution API' 
      });
    }

    // Verificar se a resposta é um array ou se tem uma propriedade específica
    let instancesData = evolutionResponse.data;
    if (typeof evolutionResponse.data === 'object' && !Array.isArray(evolutionResponse.data)) {
      // Se não for array, tentar encontrar a propriedade com as instâncias
      if (evolutionResponse.data.instances) {
        instancesData = evolutionResponse.data.instances;
      } else if (evolutionResponse.data.data) {
        instancesData = evolutionResponse.data.data;
      }
    }

    if (!Array.isArray(instancesData)) {
      return res.status(400).json({ 
        error: 'Formato de resposta inválido da Evolution API',
        receivedData: typeof evolutionResponse.data,
        data: evolutionResponse.data
      });
    }

         const syncedInstances = instancesData.map(instance => {
       return {
         id: `evolution-${instance.name}`,
         name: instance.name,
         instanceName: instance.name,
         description: `Instância da Evolution API - ${instance.name}`,
         status: instance.connectionStatus || 'DISCONNECTED',
         qrCode: instance.qrcode,
         
         webhookEvents: [],
         settings: instance,
         organizationId: req.user.organizationId,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
         _count: {
           conversations: 0,
           messages: 0
         },
         isFromEvolution: true
       };
     });

    logger.info(`Sincronização concluída: ${syncedInstances.length} instâncias encontradas`);

    res.json({
      message: `${syncedInstances.length} instâncias sincronizadas da Evolution API`,
      instances: syncedInstances
    });

  } catch (error) {
    logger.error('Erro ao sincronizar instâncias:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    let errorMessage = 'Erro ao sincronizar com Evolution API';
    let errorDetails = error.message;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Não foi possível conectar com a Evolution API';
      errorDetails = 'Verifique se a URL da API está correta e se o servidor está rodando';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'URL da Evolution API não encontrada';
      errorDetails = 'Verifique se a Base URL está correta';
    } else if (error.response?.status === 401) {
      errorMessage = 'API Key inválida';
      errorDetails = 'Verifique se a API Key está correta';
    } else if (error.response?.status === 404) {
      errorMessage = 'Endpoint não encontrado';
      errorDetails = 'Verifique se a URL da API está correta';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
});



// Buscar instância por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      include: {
        _count: {
          select: {
            conversations: true,
            messages: true
          }
        }
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    res.json(instance);

  } catch (error) {
    logger.error('Erro ao buscar instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova instância
router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), instanceValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { name, instanceName, description, webhookEvents } = req.body;

    // Verificar se o nome da instância já existe
    const existingInstance = await prisma.instance.findUnique({
      where: { instanceName }
    });

    if (existingInstance) {
      return res.status(409).json({ 
        error: 'Nome da instância já existe' 
      });
    }

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    logger.info('Configuração da Evolution API:', {
      baseUrl: evolutionConfig.baseUrl,
      hasApiKey: !!evolutionConfig.apiKey,
      apiKeyLength: evolutionConfig.apiKey ? evolutionConfig.apiKey.length : 0
    });

    // Criar instância na Evolution API
    try {
      logger.info('Criando instância na Evolution API:', {
        instanceName,
        baseUrl: evolutionConfig.baseUrl
      });

             const sanitizedInstanceName = String(instanceName || '').trim();
       // Enviar exatamente o payload exigido pela Evolution API
       const requestData = {
         instanceName: sanitizedInstanceName,
         qrcode: true,
         integration: "WHATSAPP-BAILEYS"
       };

      logger.info('Dados da requisição:', requestData);
      logger.info('URL da requisição:', `${evolutionConfig.baseUrl}/instance/create`);
      logger.info('Headers da requisição:', {
        'apikey': evolutionConfig.apiKey ? '***' : 'não definida',
        'Content-Type': 'application/json'
      });

      const evolutionResponse = await axios.post(
        `${evolutionConfig.baseUrl}/instance/create`,
        requestData,
        {
          headers: {
            'apikey': evolutionConfig.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info('Resposta da Evolution API:', {
        status: evolutionResponse.status,
        statusText: evolutionResponse.statusText,
        headers: evolutionResponse.headers,
        data: evolutionResponse.data
      });

      if (evolutionResponse.data.error) {
        throw new Error(evolutionResponse.data.error);
      }

    } catch (evolutionError) {
             logger.error('Erro ao criar instância na Evolution API:', {
         message: evolutionError.message,
         code: evolutionError.code,
         response: evolutionError.response?.data,
         status: evolutionError.response?.status,
         statusText: evolutionError.response?.statusText,
         headers: evolutionError.response?.headers,
         requestData: {
           instanceName,
           baseUrl: evolutionConfig.baseUrl
         },
         config: {
           url: evolutionError.config?.url,
           method: evolutionError.config?.method,
           headers: evolutionError.config?.headers
         }
       });

      let errorMessage = 'Erro ao criar instância na Evolution API';
      let errorDetails = evolutionError.message;

      if (evolutionError.response?.status === 400) {
        errorMessage = 'Dados inválidos para criação da instância';
        errorDetails = evolutionError.response.data?.error || evolutionError.response.data?.message || 'Verifique os dados da instância';
      } else if (evolutionError.response?.status === 409) {
        errorMessage = 'Instância já existe na Evolution API';
        errorDetails = 'Uma instância com este nome já existe';
      } else if (evolutionError.response?.status === 401) {
        errorMessage = 'API Key inválida';
        errorDetails = 'Verifique se a API Key está correta';
      } else if (evolutionError.code === 'ECONNREFUSED') {
        errorMessage = 'Não foi possível conectar com a Evolution API';
        errorDetails = 'Verifique se a URL da API está correta e se o servidor está rodando';
      }

      const statusCode = evolutionError.response?.status || 500;
      return res.status(statusCode).json({ 
        error: errorMessage,
        details: errorDetails
      });
    }

    // Salvar instância no banco
    const instance = await prisma.instance.create({
      data: {
        name,
        instanceName,
        description,
        webhookEvents: webhookEvents || ['messages.upsert', 'connection.update'],
        organizationId: req.user.organizationId
      }
    });

    logger.info(`Instância ${instanceName} criada por ${req.user.email}`);

    res.status(201).json({
      message: 'Instância criada com sucesso',
      instance
    });

  } catch (error) {
    logger.error('Erro ao criar instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar instância
router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), instanceValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { name, description, webhookEvents } = req.body;

    // Verificar se a instância existe e pertence à organização
    const existingInstance = await prisma.instance.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!existingInstance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Atualizar instância
    const instance = await prisma.instance.update({
      where: { id },
      data: {
        name,
        description,
        webhookEvents: webhookEvents || ['messages.upsert', 'connection.update']
      }
    });

    logger.info(`Instância ${instance.instanceName} atualizada por ${req.user.email}`);

    res.json({
      message: 'Instância atualizada com sucesso',
      instance
    });

  } catch (error) {
    logger.error('Erro ao atualizar instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Conectar instância (gerar QR Code)
router.post('/:id/connect', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('=== INÍCIO DA CONEXÃO DE INSTÂNCIA ===');
    logger.info('Dados da requisição:', {
      instanceId: id,
      userId: req.user?.id,
      userEmail: req.user?.email,
      organizationId: req.user?.organizationId,
      method: req.method,
      url: req.url
    });

    // Verificar se o usuário existe
    if (!req.user || !req.user.organizationId) {
      logger.error('Usuário ou organização não encontrados na requisição');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se a instância existe e pertence à organização
    const instance = await prisma.instance.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    logger.info('Instância encontrada:', {
      found: !!instance,
      instanceName: instance?.instanceName,
      currentStatus: instance?.status
    });

    if (!instance) {
      logger.error('Instância não encontrada:', { instanceId: id, organizationId: req.user.organizationId });
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Atualizar status para CONNECTING
    await prisma.instance.update({
      where: { id },
      data: { status: 'CONNECTING' }
    });

    logger.info('Status atualizado para CONNECTING');

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    
    logger.info('Configuração Evolution obtida:', {
      hasConfig: !!evolutionConfig,
      baseUrl: evolutionConfig?.baseUrl,
      hasApiKey: !!evolutionConfig?.apiKey
    });
    
    if (!evolutionConfig) {
      logger.error('Evolution API não configurada para organização:', req.user.organizationId);
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    if (!evolutionConfig.baseUrl || !evolutionConfig.apiKey) {
      logger.error('Configuração da Evolution API incompleta:', {
        hasBaseUrl: !!evolutionConfig.baseUrl,
        hasApiKey: !!evolutionConfig.apiKey
      });
      return res.status(400).json({ 
        error: 'Configuração da Evolution API incompleta. Verifique Base URL e API Key.' 
      });
    }

    // Gerar QR Code na Evolution API
    try {
      const connectUrl = `${evolutionConfig.baseUrl}/instance/connect/${instance.instanceName}`;
      logger.info('Fazendo requisição para gerar QR Code:', {
        url: connectUrl,
        instanceName: instance.instanceName,
        method: 'GET',
        headers: {
          'apikey': evolutionConfig.apiKey ? '***' + evolutionConfig.apiKey.slice(-4) : 'undefined'
        }
      });

      const evolutionResponse = await axios.get(
        `${evolutionConfig.baseUrl}/instance/connect/${instance.instanceName}`,
        {
          headers: {
            'apikey': evolutionConfig.apiKey
          },
          timeout: 10000
        }
      );

      logger.info('Resposta da Evolution API para QR Code:', {
        status: evolutionResponse.status,
        data: evolutionResponse.data,
        dataKeys: Object.keys(evolutionResponse.data || {}),
        hasBase64: !!evolutionResponse.data?.base64,
        hasQrCode: !!(evolutionResponse.data?.qrcode || evolutionResponse.data?.qrCode || evolutionResponse.data?.qr),
        base64Length: evolutionResponse.data?.base64 ? evolutionResponse.data.base64.length : 0,
        responseType: typeof evolutionResponse.data
      });

      if (evolutionResponse.data.error) {
        throw new Error(evolutionResponse.data.error);
      }

      // Tentar diferentes propriedades para o QR Code
      let qrCode = evolutionResponse.data.base64 || 
                   evolutionResponse.data.qrcode || 
                   evolutionResponse.data.qrCode || 
                   evolutionResponse.data.qr ||
                   evolutionResponse.data.qrcodeUrl ||
                   evolutionResponse.data.qrUrl;

      // Se o QR Code vier como base64, converter para data URL
      if (qrCode && !qrCode.startsWith('http') && !qrCode.startsWith('data:')) {
        // Verificar se é base64
        if (qrCode.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
          qrCode = `data:image/png;base64,${qrCode}`;
        } else {
          // Se não for base64 válido, pode ser uma URL relativa
          qrCode = `${evolutionConfig.baseUrl}${qrCode.startsWith('/') ? '' : '/'}${qrCode}`;
        }
      }

      logger.info('QR Code processado:', {
        hasQrCode: !!qrCode,
        qrCodeLength: qrCode ? qrCode.length : 0,
        qrCodePreview: qrCode ? qrCode.substring(0, 50) + '...' : 'null',
        isDataUrl: qrCode ? qrCode.startsWith('data:') : false,
        isHttpUrl: qrCode ? qrCode.startsWith('http') : false
      });

      // Atualizar instância com QR Code e status
      await prisma.instance.update({
        where: { id },
        data: { 
          qrCode,
          status: qrCode ? 'QRCODE' : 'CONNECTING'
        }
      });

      logger.info(`QR Code gerado para instância ${instance.instanceName}`);



      res.json({
        message: 'QR Code gerado com sucesso',
        qrCode,
        status: qrCode ? 'QRCODE' : 'CONNECTING',
        instanceName: instance.instanceName,

      });

    } catch (evolutionError) {
      // Atualizar status para ERROR
      await prisma.instance.update({
        where: { id },
        data: { status: 'ERROR' }
      });

      logger.error('=== ERRO DETALHADO NA EVOLUTION API ===');
      logger.error('Erro ao gerar QR Code na Evolution API:', {
        error: evolutionError.message,
        response: evolutionError.response?.data,
        status: evolutionError.response?.status,
        url: evolutionError.config?.url,
        config: evolutionError.config,
        code: evolutionError.code,
        stack: evolutionError.stack
      });
      
      res.status(500).json({ 
        error: 'Erro ao gerar QR Code na Evolution API',
        details: evolutionError.message,
        config: {
          baseUrl: evolutionConfig?.baseUrl,
          hasApiKey: !!evolutionConfig?.apiKey
        }
      });
    }

  } catch (error) {
    logger.error('=== ERRO GERAL NA CONEXÃO DE INSTÂNCIA ===');
    logger.error('Erro ao conectar instância:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Verificar status da instância
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a instância existe e pertence à organização
    const instance = await prisma.instance.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    // Verificar status na Evolution API
    try {
      const evolutionResponse = await axios.get(
        `${evolutionConfig.baseUrl}/instance/connectionState/${instance.instanceName}`,
        {
          headers: {
            'apikey': evolutionConfig.apiKey
          }
        }
      );

      if (evolutionResponse.data.error) {
        throw new Error(evolutionResponse.data.error);
      }

      const status = evolutionResponse.data.state;
      
      // Atualizar status no banco
      await prisma.instance.update({
        where: { id },
        data: { status }
      });

      res.json({
        status,
        instanceName: instance.instanceName
      });

    } catch (evolutionError) {
      logger.error('Erro ao verificar status na Evolution API:', evolutionError);
      res.status(500).json({ 
        error: 'Erro ao verificar status na Evolution API' 
      });
    }

  } catch (error) {
    logger.error('Erro ao verificar status da instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Desconectar instância
router.post('/:id/disconnect', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a instância existe e pertence à organização
    const instance = await prisma.instance.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    // Desconectar na Evolution API
    try {
      const evolutionResponse = await axios.delete(
        `${evolutionConfig.baseUrl}/instance/logout/${instance.instanceName}`,
        {
          headers: {
            'apikey': evolutionConfig.apiKey
          }
        }
      );

      if (evolutionResponse.data.error) {
        throw new Error(evolutionResponse.data.error);
      }

      // Atualizar status no banco
      await prisma.instance.update({
        where: { id },
        data: { 
          status: 'DISCONNECTED',
          qrCode: null
        }
      });

      logger.info(`Instância ${instance.instanceName} desconectada por ${req.user.email}`);

      res.json({
        message: 'Instância desconectada com sucesso'
      });

    } catch (evolutionError) {
      logger.error('Erro ao desconectar na Evolution API:', evolutionError);
      res.status(500).json({ 
        error: 'Erro ao desconectar na Evolution API' 
      });
    }

  } catch (error) {
    logger.error('Erro ao desconectar instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir instância
router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Tentativa de exclusão de instância:', {
      id,
      organizationId: req.user.organizationId,
      userEmail: req.user.email
    });

    // Verificar se a instância existe e pertence à organização
    const instance = await prisma.instance.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    logger.info('Resultado da busca da instância:', {
      found: !!instance,
      instanceId: instance?.id,
      instanceName: instance?.instanceName,
      organizationId: instance?.organizationId,
      isFromEvolution: id.startsWith('evolution-')
    });

    // Se é uma instância da Evolution API que não está no banco local
    if (!instance && id.startsWith('evolution-')) {
      const instanceName = id.replace('evolution-', '');
      logger.info('Tentando excluir instância da Evolution API:', {
        instanceName,
        originalId: id
      });

      // Verificar se a Evolution API está configurada
      const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
      if (!evolutionConfig) {
        return res.status(400).json({ 
          error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
        });
      }

      // Excluir apenas da Evolution API
      try {
        logger.info('Excluindo instância da Evolution API:', {
          instanceName,
          baseUrl: evolutionConfig.baseUrl
        });

        const evolutionResponse = await axios.delete(
          `${evolutionConfig.baseUrl}/instance/delete/${instanceName}`,
          {
            headers: {
              'apikey': evolutionConfig.apiKey
            }
          }
        );

        logger.info('Resposta da Evolution API para exclusão:', {
          status: evolutionResponse.status,
          data: evolutionResponse.data,
          success: evolutionResponse.data?.status === 'SUCCESS',
          error: evolutionResponse.data?.error
        });

        if (evolutionResponse.data.error) {
          throw new Error(evolutionResponse.data.error);
        }

        logger.info(`Instância ${instanceName} excluída com sucesso da Evolution API`);

        res.json({
          message: 'Instância excluída com sucesso da Evolution API'
        });

      } catch (evolutionError) {
        logger.error('Erro ao excluir instância da Evolution API:', {
          message: evolutionError.message,
          code: evolutionError.code,
          response: evolutionError.response?.data,
          status: evolutionError.response?.status
        });
        
        res.status(500).json({ 
          error: 'Erro ao excluir instância da Evolution API',
          details: evolutionError.message
        });
      }
      return;
    }

    if (!instance) {
      logger.warn('Instância não encontrada para exclusão:', {
        requestedId: id,
        organizationId: req.user.organizationId
      });
      return res.status(404).json({ 
        error: 'Instância não encontrada',
        details: `Instância com ID ${id} não foi encontrada na organização`
      });
    }

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    // Excluir da Evolution API
    try {
      logger.info('Excluindo instância na Evolution API:', {
        instanceName: instance.instanceName,
        baseUrl: evolutionConfig.baseUrl
      });

      const evolutionResponse = await axios.delete(
        `${evolutionConfig.baseUrl}/instance/delete/${instance.instanceName}`,
        {
          headers: {
            'apikey': evolutionConfig.apiKey
          }
        }
      );

      logger.info('Resposta da Evolution API para exclusão:', {
        status: evolutionResponse.status,
        data: evolutionResponse.data,
        success: evolutionResponse.data?.status === 'SUCCESS',
        error: evolutionResponse.data?.error
      });

      if (evolutionResponse.data.error) {
        throw new Error(evolutionResponse.data.error);
      }

      logger.info(`Instância ${instance.instanceName} excluída com sucesso na Evolution API`);

    } catch (evolutionError) {
      logger.error('Erro ao excluir instância na Evolution API:', {
        message: evolutionError.message,
        code: evolutionError.code,
        response: evolutionError.response?.data,
        status: evolutionError.response?.status
      });
      // Continuar mesmo se falhar na Evolution API
    }

    // Excluir do banco
    await prisma.instance.delete({
      where: { id }
    });

    logger.info(`Instância ${instance.instanceName} excluída por ${req.user.email}`);

    res.json({
      message: 'Instância excluída com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao excluir instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar configurações de uma instância
router.get('/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Requisição para buscar configurações da instância:', {
      instanceId: id,
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      userEmail: req.user?.email
    });

    // Buscar instância no banco
    const instance = await prisma.instance.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!instance) {
      logger.warn('Instância não encontrada para buscar configurações:', {
        requestedId: id,
        organizationId: req.user.organizationId
      });
      return res.status(404).json({ 
        error: 'Instância não encontrada',
        details: `Instância com ID ${id} não foi encontrada na organização`
      });
    }

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    // Buscar configurações na Evolution API
    try {
      logger.info('Buscando configurações na Evolution API:', {
        instanceName: instance.instanceName,
        baseUrl: evolutionConfig.baseUrl
      });

      const evolutionResponse = await axios.get(
        `${evolutionConfig.baseUrl}/settings/find/${instance.instanceName}`,
        {
          headers: {
            'apikey': evolutionConfig.apiKey
          }
        }
      );

      logger.info('Resposta da Evolution API para configurações:', {
        status: evolutionResponse.status,
        data: evolutionResponse.data,
        hasData: !!evolutionResponse.data
      });

      if (evolutionResponse.data.error) {
        throw new Error(evolutionResponse.data.error);
      }

      res.json({
        message: 'Configurações obtidas com sucesso',
        settings: evolutionResponse.data,
        instanceName: instance.instanceName
      });

    } catch (evolutionError) {
      logger.error('Erro ao buscar configurações na Evolution API:', {
        message: evolutionError.message,
        code: evolutionError.code,
        response: evolutionError.response?.data,
        status: evolutionError.response?.status
      });
      
      res.status(500).json({ 
        error: 'Erro ao buscar configurações na Evolution API',
        details: evolutionError.message
      });
    }

  } catch (error) {
    logger.error('Erro ao buscar configurações da instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações de uma instância
router.put('/:id/settings', [
  body('rejectCall').optional().isBoolean().withMessage('rejectCall deve ser um booleano'),
  body('msgCall').optional().isString().withMessage('msgCall deve ser uma string'),
  body('groupsIgnore').optional().isBoolean().withMessage('groupsIgnore deve ser um booleano'),
  body('alwaysOnline').optional().isBoolean().withMessage('alwaysOnline deve ser um booleano'),
  body('readMessages').optional().isBoolean().withMessage('readMessages deve ser um booleano'),
  body('syncFullHistory').optional().isBoolean().withMessage('syncFullHistory deve ser um booleano'),
  body('readStatus').optional().isBoolean().withMessage('readStatus deve ser um booleano')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const settings = req.body;
    
    logger.info('Requisição para atualizar configurações da instância:', {
      instanceId: id,
      settings: settings,
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      userEmail: req.user?.email
    });

    // Buscar instância no banco
    const instance = await prisma.instance.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!instance) {
      logger.warn('Instância não encontrada para atualizar configurações:', {
        requestedId: id,
        organizationId: req.user.organizationId
      });
      return res.status(404).json({ 
        error: 'Instância não encontrada',
        details: `Instância com ID ${id} não foi encontrada na organização`
      });
    }

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    // Atualizar configurações na Evolution API
    try {
      logger.info('Atualizando configurações na Evolution API:', {
        instanceName: instance.instanceName,
        baseUrl: evolutionConfig.baseUrl,
        settings: settings
      });

      const evolutionResponse = await axios.post(
        `${evolutionConfig.baseUrl}/settings/set/${instance.instanceName}`,
        settings,
        {
          headers: {
            'apikey': evolutionConfig.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Resposta da Evolution API para atualização de configurações:', {
        status: evolutionResponse.status,
        data: evolutionResponse.data,
        hasData: !!evolutionResponse.data
      });

      if (evolutionResponse.data.error) {
        throw new Error(evolutionResponse.data.error);
      }

      res.json({
        message: 'Configurações atualizadas com sucesso',
        settings: evolutionResponse.data,
        instanceName: instance.instanceName
      });

    } catch (evolutionError) {
      logger.error('Erro ao atualizar configurações na Evolution API:', {
        message: evolutionError.message,
        code: evolutionError.code,
        response: evolutionError.response?.data,
        status: evolutionError.response?.status
      });
      
      res.status(500).json({ 
        error: 'Erro ao atualizar configurações na Evolution API',
        details: evolutionError.message
      });
    }

  } catch (error) {
    logger.error('Erro ao atualizar configurações da instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
