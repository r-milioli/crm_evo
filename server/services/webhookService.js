const axios = require('axios');
const logger = require('../utils/logger');
const { getEvolutionConfig } = require('../utils/evolutionConfig');

class WebhookService {
  /**
   * Configura webhook para uma instância
   * @param {string} instanceName - Nome da instância
   * @param {string} organizationId - ID da organização
   */
  async configureWebhook(instanceName, organizationId) {
    try {
      // Obter configuração da Evolution API
      const config = await getEvolutionConfig(organizationId);
      if (!config) {
        throw new Error('Configuração da Evolution API não encontrada');
      }
      
      // Gerar URL do webhook automaticamente
      const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3001';
      const finalWebhookUrl = `${baseUrl}/api/webhooks/evolution/${instanceName}`;
      
      logger.info(`URL do webhook gerada automaticamente: ${finalWebhookUrl}`);
      
      logger.info(`Configurando webhook para instância ${instanceName}: ${finalWebhookUrl}`);
      
      const response = await axios.post(
        `${config.baseUrl}/webhook/set/${instanceName}`,
        {
          webhook: {
            enabled: true,
            url: finalWebhookUrl,
            events: [
              "APPLICATION_STARTUP",
              "QRCODE_UPDATED",
              "MESSAGES_SET",
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "MESSAGES_DELETE",
              "SEND_MESSAGE",
              "CONTACTS_SET",
              "CONTACTS_UPSERT",
              "CONTACTS_UPDATE",
              "PRESENCE_UPDATE",
              "CHATS_SET",
              "CHATS_UPSERT",
              "CHATS_UPDATE",
              "CHATS_DELETE",
              "GROUPS_UPSERT",
              "GROUP_UPDATE",
              "GROUP_PARTICIPANTS_UPDATE",
              "CONNECTION_UPDATE",
              "LABELS_EDIT",
              "LABELS_ASSOCIATION",
              "CALL",
              "TYPEBOT_START",
              "TYPEBOT_CHANGE_STATUS"
            ]
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.apiKey
          }
        }
      );

      logger.info(`Webhook configurado para instância ${instanceName}:`, response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error(`Erro ao configurar webhook para instância ${instanceName}:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Verifica o status do webhook de uma instância
   * @param {string} instanceName - Nome da instância
   * @param {string} organizationId - ID da organização
   */
  async checkWebhookStatus(instanceName, organizationId) {
    try {
      logger.info(`Verificando status do webhook para instância ${instanceName}`);
      
      // Obter configuração da Evolution API
      const config = await getEvolutionConfig(organizationId);
      if (!config) {
        throw new Error('Configuração da Evolution API não encontrada');
      }
      
      const response = await axios.get(
        `${config.baseUrl}/webhook/find/${instanceName}`,
        {
          headers: {
            'apikey': config.apiKey
          }
        }
      );

      logger.info(`Status do webhook para instância ${instanceName}:`, response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error(`Erro ao verificar status do webhook para instância ${instanceName}:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new WebhookService();
