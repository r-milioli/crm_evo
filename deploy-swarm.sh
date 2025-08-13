#!/bin/bash

# Script de deploy para Docker Swarm
# Uso: ./deploy-swarm.sh [stack-name]

set -e

STACK_NAME=${1:-crm-evolution}

echo "🚀 Iniciando deploy do CRM Evolution no Docker Swarm..."

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "📝 Arquivo .env não encontrado. Copiando exemplo..."
    cp env.swarm.example .env
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações antes de continuar!"
    echo "   - Configure DATABASE_URL (seu PostgreSQL existente)"
    echo "   - Configure JWT_SECRET"
    echo "   - Configure DOMAIN"
    echo "   - Configure EVOLUTION_API_URL e EVOLUTION_API_KEY"
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker e tente novamente."
    exit 1
fi

# Verificar se está em modo Swarm
SWARM_STATE=$(docker info --format "{{.Swarm.LocalNodeState}}")
if [ "$SWARM_STATE" != "active" ]; then
    echo "🌐 Inicializando modo Swarm..."
    docker swarm init
fi

# Verificar se a rede network_public existe
if ! docker network ls | grep -q network_public; then
    echo "🌐 Criando rede network_public..."
    docker network create --driver overlay --attachable network_public
fi

# Verificar se a imagem existe localmente
if ! docker images | grep -q "automacaodebaixocusto/crm.*latest"; then
    echo "📦 Imagem não encontrada localmente. Fazendo pull..."
    docker pull automacaodebaixocusto/crm:latest
fi

# Deploy da stack
echo "📦 Fazendo deploy da stack '$STACK_NAME'..."
docker stack deploy -c docker-stack.yml --env-file .env $STACK_NAME

# Aguardar serviços estarem prontos
echo "⏳ Aguardando serviços estarem prontos..."
sleep 15

# Verificar status da stack
echo "🔍 Verificando status da stack..."
docker stack services $STACK_NAME

echo ""
echo "🎉 Deploy da stack concluído com sucesso!"
echo ""
echo "📋 Comandos úteis:"
echo "   - Status da stack: docker stack services $STACK_NAME"
echo "   - Logs: docker service logs ${STACK_NAME}_crm-evolution"
echo "   - Logs em tempo real: docker service logs -f ${STACK_NAME}_crm-evolution"
echo "   - Remover stack: docker stack rm $STACK_NAME"
echo "   - Atualizar stack: docker stack deploy -c docker-stack.yml --env-file .env $STACK_NAME"
echo ""
echo "🔍 Verificar saúde:"
echo "   - docker service ps ${STACK_NAME}_crm-evolution"
echo ""
