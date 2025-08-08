const { PrismaClient } = require('@prisma/client');

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

module.exports = {
  getEvolutionConfig,
  isEvolutionConfigured
};
