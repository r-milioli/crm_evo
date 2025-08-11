const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

/**
 * Obtém as configurações da Evolution API para uma organização
 * @param {string} organizationId - ID da organização
 * @returns {Promise<{baseUrl: string, apiKey: string} | null>}
 */
async function getEvolutionConfig(organizationId) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    if (!organization || !organization.settings) {
      return null;
    }

    const settings = organization.settings;
    const evolutionConfig = settings.evolution;

    if (!evolutionConfig || !evolutionConfig.baseUrl || !evolutionConfig.apiKey) {
      return null;
    }

    return {
      baseUrl: evolutionConfig.baseUrl,
      apiKey: evolutionConfig.apiKey
    };
  } catch (error) {
    console.error('Erro ao obter configurações da Evolution API:', error);
    return null;
  }
}

/**
 * Verifica se a Evolution API está configurada para uma organização
 * @param {string} organizationId - ID da organização
 * @returns {Promise<boolean>}
 */
async function isEvolutionConfigured(organizationId) {
  const config = await getEvolutionConfig(organizationId);
  return !!config;
}

/**
 * Sincroniza chats da Evolution API com o sistema de conversas
 * @param {string} organizationId - ID da organização
 * @param {string} instanceName - Nome da instância na Evolution API
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
async function syncEvolutionChats(organizationId, instanceName) {
  try {
    const config = await getEvolutionConfig(organizationId);
    if (!config) {
      return {
        success: false,
        message: 'Configurações da Evolution API não encontradas'
      };
    }

    // Buscar um usuário da organização para usar como createdBy
    const user = await prisma.user.findFirst({
      where: { organizationId: organizationId }
    });

    if (!user) {
      return {
        success: false,
        message: 'Nenhum usuário encontrado na organização'
      };
    }

    // Buscar a instância no banco usando o instanceName
    const instance = await prisma.instance.findFirst({
      where: {
        instanceName: instanceName,
        organizationId: organizationId
      }
    });

    if (!instance) {
      return {
        success: false,
        message: 'Instância não encontrada'
      };
    }

    // Buscar chats da Evolution API usando o instanceName
    const response = await axios.post(`${config.baseUrl}/chat/findChats/${instance.instanceName}`, {}, {
      headers: {
        'apikey': config.apiKey
      }
    });

    const chats = response.data;
    const results = {
      created: 0,
      updated: 0,
      errors: 0
    };

    for (const chat of chats) {
      try {
        // Extrair número do telefone do remoteJid
        const phoneNumber = chat.remoteJid.split('@')[0];
        
        // Verificar se já existe um contato
        let contact = await prisma.contact.findFirst({
          where: {
            phoneNumber: phoneNumber,
            organizationId: organizationId
          }
        });

        // Criar ou atualizar contato
        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              name: chat.pushName || `Contato ${phoneNumber}`,
              phoneNumber: phoneNumber,
              email: null,
              organizationId: organizationId,
              instanceId: instance.id,
              externalId: chat.id,
              metadata: {
                profilePicUrl: chat.profilePicUrl,
                pushName: chat.pushName,
                remoteJid: chat.remoteJid
              }
            }
          });
        } else {
          // Atualizar dados do contato
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              name: chat.pushName || contact.name,
              externalId: chat.id,
              metadata: {
                ...contact.metadata,
                profilePicUrl: chat.profilePicUrl,
                pushName: chat.pushName,
                remoteJid: chat.remoteJid,
                lastUpdated: new Date().toISOString()
              }
            }
          });
        }

        // Verificar se já existe uma conversa
        let conversation = await prisma.conversation.findFirst({
          where: {
            contactId: contact.id,
            instanceId: instance.id,
            organizationId: organizationId
          }
        });

        if (!conversation) {
          // Criar nova conversa
          conversation = await prisma.conversation.create({
            data: {
              title: chat.pushName || `Conversa com ${phoneNumber}`,
              status: 'OPEN',
              priority: 'MEDIUM',
              contactId: contact.id,
              instanceId: instance.id,
              organizationId: organizationId,
              createdById: user.id,
              externalId: chat.id,
              lastMessageAt: chat.updatedAt ? new Date(chat.updatedAt) : null,
              metadata: {
                windowStart: chat.windowStart,
                windowExpires: chat.windowExpires,
                windowActive: chat.windowActive,
                lastMessageAt: chat.updatedAt
              }
            }
          });
          results.created++;
        } else {
          // Atualizar conversa existente
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              title: chat.pushName || conversation.title,
              lastMessageAt: chat.updatedAt ? new Date(chat.updatedAt) : null,
              metadata: {
                ...conversation.metadata,
                windowStart: chat.windowStart,
                windowExpires: chat.windowExpires,
                windowActive: chat.windowActive,
                lastMessageAt: chat.updatedAt
              }
            }
          });
          results.updated++;
        }

      } catch (error) {
        console.error(`Erro ao processar chat ${chat.id}:`, error);
        results.errors++;
      }
    }

    return {
      success: true,
      message: `Sincronização concluída: ${results.created} criadas, ${results.updated} atualizadas, ${results.errors} erros`,
      data: results
    };

  } catch (error) {
    console.error('Erro ao sincronizar chats da Evolution API:', error);
    return {
      success: false,
      message: `Erro ao sincronizar: ${error.message}`
    };
  }
}

/**
 * Busca mensagens de um chat específico da Evolution API
 * @param {string} organizationId - ID da organização
 * @param {string} instanceName - Nome da instância na Evolution API
 * @param {string} chatId - ID do chat
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
async function getEvolutionMessages(organizationId, instanceName, chatId) {
  try {
    const config = await getEvolutionConfig(organizationId);
    if (!config) {
      return {
        success: false,
        message: 'Configurações da Evolution API não encontradas'
      };
    }

    // Buscar a instância no banco usando o instanceName
    const instance = await prisma.instance.findFirst({
      where: {
        instanceName: instanceName,
        organizationId: organizationId
      }
    });

    if (!instance) {
      return {
        success: false,
        message: 'Instância não encontrada'
      };
    }

    const response = await axios.get(`${config.baseUrl}/chat/findMessages/${instance.instanceName}`, {
      headers: {
        'apikey': config.apiKey
      },
      params: {
        where: {
          key: {
            remoteJid: chatId
          }
        }
      }
    });

    return {
      success: true,
      message: 'Mensagens recuperadas com sucesso',
      data: response.data
    };

  } catch (error) {
    console.error('Erro ao buscar mensagens da Evolution API:', error);
    return {
      success: false,
      message: `Erro ao buscar mensagens: ${error.message}`
    };
  }
}

/**
 * Sincroniza mensagens de uma conversa da Evolution API
 * @param {string} organizationId - ID da organização
 * @param {string} instanceName - Nome da instância na Evolution API
 * @param {string} conversationId - ID da conversa local
 * @param {string} remoteJid - Remote JID do chat
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
async function syncEvolutionMessages(organizationId, instanceName, conversationId, remoteJid) {
  try {
    const config = await getEvolutionConfig(organizationId);
    if (!config) {
      return {
        success: false,
        message: 'Configurações da Evolution API não encontradas'
      };
    }

    // Buscar a instância no banco usando o instanceName
    const instance = await prisma.instance.findFirst({
      where: {
        instanceName: instanceName,
        organizationId: organizationId
      }
    });

    if (!instance) {
      return {
        success: false,
        message: 'Instância não encontrada'
      };
    }

    // Buscar a conversa
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: organizationId
      },
      include: {
        contact: true
      }
    });

    if (!conversation) {
      return {
        success: false,
        message: 'Conversa não encontrada'
      };
    }

    // Buscar mensagens da Evolution API
    const response = await axios.post(`${config.baseUrl}/chat/findMessages/${instance.instanceName}`, {
      where: {
        key: {
          remoteJid: remoteJid
        }
      },
      page: 1,
      offset: 50
    }, {
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    const messages = response.data.messages?.records || [];
    const results = {
      created: 0,
      updated: 0,
      errors: 0
    };

    // Processar cada mensagem
    for (const message of messages) {
      try {
        // Extrair conteúdo da mensagem baseado no tipo
        let content = 'Mensagem não suportada';
        let messageType = 'TEXT';
        
        if (message.message?.conversation) {
          content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
          content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
          content = '[Imagem]';
          messageType = 'IMAGE';
        } else if (message.message?.documentMessage) {
          content = `[Documento: ${message.message.documentMessage.fileName || 'Arquivo'}]`;
          messageType = 'DOCUMENT';
        } else if (message.message?.audioMessage) {
          content = '[Áudio]';
          messageType = 'AUDIO';
        } else if (message.message?.videoMessage) {
          content = '[Vídeo]';
          messageType = 'VIDEO';
        }

        // Determinar status da mensagem
        let messageStatus = 'SENT';
        if (message.MessageUpdate && message.MessageUpdate.length > 0) {
          const lastUpdate = message.MessageUpdate[message.MessageUpdate.length - 1];
          if (lastUpdate.status === 'READ') {
            messageStatus = 'READ';
          } else if (lastUpdate.status === 'DELIVERY_ACK') {
            messageStatus = 'DELIVERED';
          }
        }

        // Criar nova mensagem
        await prisma.message.create({
          data: {
            content: content,
            type: messageType,
            direction: message.key.fromMe ? 'OUTBOUND' : 'INBOUND',
            status: messageStatus,
            organizationId: organizationId,
            conversationId: conversationId,
            contactId: conversation.contactId,
            instanceId: instance.id,
            metadata: {
              externalId: message.key.id,
              messageTimestamp: message.messageTimestamp,
              messageType: message.messageType,
              pushName: message.pushName,
              source: message.source,
              originalMessage: message
            }
          }
        });
        results.created++;
      } catch (error) {
        console.error(`Erro ao processar mensagem ${message.key.id}:`, error.message);
        results.errors++;
      }
    }

    return {
      success: true,
      message: `Sincronização de mensagens concluída: ${results.created} criadas, ${results.updated} atualizadas, ${results.errors} erros`,
      data: results
    };

  } catch (error) {
    console.error('Erro ao sincronizar mensagens da Evolution API:', error);
    return {
      success: false,
      message: `Erro ao sincronizar mensagens: ${error.message}`
    };
  }
}

/**
 * Busca contatos da Evolution API
 * @param {string} organizationId - ID da organização
 * @param {string} instanceName - Nome da instância na Evolution API
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
async function getEvolutionContacts(organizationId, instanceName) {
  try {
    const config = await getEvolutionConfig(organizationId);
    if (!config) {
      return {
        success: false,
        message: 'Configurações da Evolution API não encontradas'
      };
    }

    // Buscar a instância no banco usando o instanceName
    const instance = await prisma.instance.findFirst({
      where: {
        instanceName: instanceName,
        organizationId: organizationId
      }
    });

    if (!instance) {
      return {
        success: false,
        message: 'Instância não encontrada'
      };
    }

    const response = await axios.post(`${config.baseUrl}/chat/findContacts/${instance.instanceName}`, {
      where: {}
    }, {
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      message: 'Contatos recuperados com sucesso',
      data: response.data
    };

  } catch (error) {
    console.error('Erro ao buscar contatos da Evolution API:', error);
    return {
      success: false,
      message: `Erro ao buscar contatos: ${error.message}`
    };
  }
}

/**
 * Busca status de uma mensagem específica da Evolution API
 * @param {string} organizationId - ID da organização
 * @param {string} instanceName - Nome da instância na Evolution API
 * @param {string} remoteJid - ID do chat
 * @param {string} messageId - ID da mensagem
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
async function getEvolutionMessageStatus(organizationId, instanceName, remoteJid, messageId) {
  try {
    const config = await getEvolutionConfig(organizationId);
    if (!config) {
      return {
        success: false,
        message: 'Configurações da Evolution API não encontradas'
      };
    }

    // Buscar a instância no banco usando o instanceName
    const instance = await prisma.instance.findFirst({
      where: {
        instanceName: instanceName,
        organizationId: organizationId
      }
    });

    if (!instance) {
      return {
        success: false,
        message: 'Instância não encontrada'
      };
    }

    const response = await axios.post(`${config.baseUrl}/chat/findStatusMessage/${instance.instanceName}`, {
      where: {
        remoteJid: remoteJid,
        id: messageId
      }
    }, {
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      message: 'Status da mensagem recuperado com sucesso',
      data: response.data
    };

  } catch (error) {
    console.error('Erro ao buscar status da mensagem da Evolution API:', error);
    return {
      success: false,
      message: `Erro ao buscar status da mensagem: ${error.message}`
    };
  }
}

module.exports = {
  getEvolutionConfig,
  isEvolutionConfigured,
  syncEvolutionChats,
  getEvolutionMessages,
  getEvolutionContacts,
  getEvolutionMessageStatus,
  syncEvolutionMessages
};
