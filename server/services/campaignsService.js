const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { getEvolutionConfig } = require('../utils/evolutionConfig');
const axios = require('axios');

const prisma = new PrismaClient();

class CampaignsService {
  /**
   * Criar uma nova campanha
   */
  async createCampaign(data, organizationId, createdById) {
    try {
      const campaign = await prisma.campaign.create({
        data: {
          name: data.name,
          description: data.description,
          messageTemplate: data.messageTemplate,
          targetContacts: data.targetContacts || [],
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
          organizationId,
          createdById
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      logger.info(`Campanha criada: ${campaign.id} por ${createdById}`);
      return { success: true, data: campaign };
    } catch (error) {
      logger.error('Erro ao criar campanha:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Listar campanhas da organização
   */
  async listCampaigns(organizationId, filters = {}) {
    try {
      const where = {
        organizationId,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
          ]
        })
      };

      const campaigns = await prisma.campaign.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return { success: true, data: campaigns };
    } catch (error) {
      logger.error('Erro ao listar campanhas:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obter campanha por ID
   */
  async getCampaign(campaignId, organizationId) {
    try {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          organizationId
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!campaign) {
        return { success: false, error: 'Campanha não encontrada' };
      }

      return { success: true, data: campaign };
    } catch (error) {
      logger.error('Erro ao obter campanha:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualizar campanha
   */
  async updateCampaign(campaignId, data, organizationId) {
    try {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          organizationId
        }
      });

      if (!campaign) {
        return { success: false, error: 'Campanha não encontrada' };
      }

      const updateData = {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.messageTemplate && { messageTemplate: data.messageTemplate }),
        ...(data.targetContacts && { targetContacts: data.targetContacts }),
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
        ...(data.status && { status: data.status })
      };

      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      logger.info(`Campanha atualizada: ${campaignId}`);
      return { success: true, data: updatedCampaign };
    } catch (error) {
      logger.error('Erro ao atualizar campanha:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Excluir campanha
   */
  async deleteCampaign(campaignId, organizationId) {
    try {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          organizationId
        }
      });

      if (!campaign) {
        return { success: false, error: 'Campanha não encontrada' };
      }

      if (campaign.status === 'RUNNING') {
        return { success: false, error: 'Não é possível excluir uma campanha em execução' };
      }

      await prisma.campaign.delete({
        where: { id: campaignId }
      });

      logger.info(`Campanha excluída: ${campaignId}`);
      return { success: true, message: 'Campanha excluída com sucesso' };
    } catch (error) {
      logger.error('Erro ao excluir campanha:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Executar campanha
   */
  async executeCampaign(campaignId, organizationId, instanceName) {
    try {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          organizationId
        }
      });

      if (!campaign) {
        return { success: false, error: 'Campanha não encontrada' };
      }

      if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
        return { success: false, error: 'Campanha não pode ser executada' };
      }

      // Obter configuração da Evolution API
      const evolutionConfig = await getEvolutionConfig(organizationId);
      if (!evolutionConfig) {
        return { success: false, error: 'Configuração da Evolution API não encontrada' };
      }

      // Obter contatos da campanha
      const contacts = await prisma.contact.findMany({
        where: {
          phoneNumber: { in: campaign.targetContacts },
          organizationId
        }
      });

      if (contacts.length === 0) {
        return { success: false, error: 'Nenhum contato encontrado para a campanha' };
      }

      // Atualizar status da campanha
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          status: 'RUNNING',
          sentAt: new Date()
        }
      });

      // Enviar mensagens para cada contato
      let sentCount = 0;
      let deliveredCount = 0;

      for (const contact of contacts) {
        try {
          // Personalizar mensagem
          const personalizedMessage = this.personalizeMessage(campaign.messageTemplate, contact);

          // Enviar mensagem via Evolution API
          const response = await axios.post(
            `${evolutionConfig.baseUrl}/message/sendText/${instanceName}`,
            {
              number: contact.phoneNumber,
              text: personalizedMessage
            },
            {
              headers: {
                'apikey': evolutionConfig.apiKey,
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.data.status === 'success') {
            sentCount++;
            
            // Criar mensagem no banco
            await prisma.message.create({
              data: {
                content: personalizedMessage,
                type: 'TEXT',
                direction: 'OUTBOUND',
                status: 'SENT',
                organizationId,
                contactId: contact.id,
                instanceId: campaign.instanceId,
                metadata: {
                  campaignId: campaign.id,
                  evolutionResponse: response.data
                }
              }
            });
          }
        } catch (error) {
          logger.error(`Erro ao enviar mensagem para ${contact.phoneNumber}:`, error);
        }
      }

      // Atualizar contadores da campanha
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount,
          deliveredCount,
          status: 'COMPLETED'
        }
      });

      logger.info(`Campanha executada: ${campaignId}, ${sentCount} mensagens enviadas`);
      return { 
        success: true, 
        data: { 
          sentCount, 
          deliveredCount,
          totalContacts: contacts.length 
        } 
      };
    } catch (error) {
      logger.error('Erro ao executar campanha:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Personalizar mensagem com dados do contato
   */
  personalizeMessage(template, contact) {
    return template
      .replace(/\{\{nome\}\}/g, contact.name || 'Cliente')
      .replace(/\{\{telefone\}\}/g, contact.phoneNumber || '')
      .replace(/\{\{email\}\}/g, contact.email || '')
      .replace(/\{\{empresa\}\}/g, contact.company || '');
  }

  /**
   * Obter estatísticas das campanhas
   */
  async getCampaignStats(organizationId) {
    try {
      const stats = await prisma.campaign.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
        _sum: {
          sentCount: true,
          deliveredCount: true,
          readCount: true
        }
      });

      const totalCampaigns = await prisma.campaign.count({
        where: { organizationId }
      });

      const totalSent = await prisma.campaign.aggregate({
        where: { organizationId },
        _sum: { sentCount: true }
      });

      const totalDelivered = await prisma.campaign.aggregate({
        where: { organizationId },
        _sum: { deliveredCount: true }
      });

      return {
        success: true,
        data: {
          totalCampaigns,
          totalSent: totalSent._sum.sentCount || 0,
          totalDelivered: totalDelivered._sum.deliveredCount || 0,
          byStatus: stats
        }
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas das campanhas:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CampaignsService();
