const axios = require('axios');
const logger = require('../utils/logger');
const { getEvolutionConfig } = require('../utils/evolutionConfig');

class EvolutionWebsocketService {
  /**
   * Configura o WebSocket para uma instância na Evolution API
   * @param {string} instanceName
   * @param {string} organizationId
   */
  async configureWebsocket(instanceName, organizationId) {
    try {
      const config = await getEvolutionConfig(organizationId);
      if (!config) {
        throw new Error('Configuração da Evolution API não encontrada');
      }

      logger.info(`Configurando WebSocket na Evolution API para instância ${instanceName}`);

      const response = await axios.post(
        `${config.baseUrl}/websocket/set/${instanceName}`,
        {
          websocket: {
            enabled: true,
            events: [
              'APPLICATION_STARTUP',
              'QRCODE_UPDATED',
              'MESSAGES_SET',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE',
              'CONTACTS_SET',
              'CONTACTS_UPSERT',
              'CONTACTS_UPDATE',
              'PRESENCE_UPDATE',
              'CHATS_SET',
              'CHATS_UPSERT',
              'CHATS_UPDATE',
              'CHATS_DELETE',
              'GROUPS_UPSERT',
              'GROUP_UPDATE',
              'GROUP_PARTICIPANTS_UPDATE',
              'CONNECTION_UPDATE',
              'LABELS_EDIT',
              'LABELS_ASSOCIATION',
              'CALL',
              'TYPEBOT_START',
              'TYPEBOT_CHANGE_STATUS'
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

      logger.info(`WebSocket configurado para ${instanceName}:`, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Erro ao configurar WebSocket para ${instanceName}:`, error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Verifica o status do WebSocket de uma instância na Evolution API
   * @param {string} instanceName
   * @param {string} organizationId
   */
  async checkWebsocketStatus(instanceName, organizationId) {
    try {
      const config = await getEvolutionConfig(organizationId);
      if (!config) {
        throw new Error('Configuração da Evolution API não encontrada');
      }

      logger.info(`Verificando status do WebSocket da Evolution API para ${instanceName}`);

      const response = await axios.get(
        `${config.baseUrl}/websocket/find/${instanceName}`,
        {
          headers: {
            'apikey': config.apiKey
          }
        }
      );

      logger.info(`Status do WebSocket para ${instanceName}:`, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Erro ao verificar WebSocket para ${instanceName}:`, error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }
}

module.exports = new EvolutionWebsocketService();


