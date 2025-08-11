const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateEvolutionConfig() {
  try {
    console.log('Atualizando configurações da Evolution API...');
    
    // Buscar todas as organizações
    const organizations = await prisma.organization.findMany();
    
    console.log(`Encontradas ${organizations.length} organizações:`);
    
    for (const org of organizations) {
      console.log(`\nAtualizando organização: ${org.name} (${org.id})`);
      
      // Atualizar configurações da Evolution API
      const updatedOrg = await prisma.organization.update({
        where: { id: org.id },
        data: {
          settings: {
            evolution: {
              baseUrl: 'http://localhost:8080',
              apiKey: '57ab56d42eaffdcce6c11d0cd42c82e2'
            }
          }
        }
      });
      
      console.log(`✅ Configurações atualizadas para: ${updatedOrg.name}`);
      console.log('   Base URL:', 'http://localhost:8080');
      console.log('   API Key:', '57ab56d42eaffdcce6c11d0cd42c82e2');
    }

    console.log('\n🎉 Todas as configurações foram atualizadas com sucesso!');

  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateEvolutionConfig();
