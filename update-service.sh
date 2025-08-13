#!/bin/bash

# Script para atualizar o serviço CRM Evolution no Docker Swarm
# Autor: Assistente
# Data: 2025-08-12

echo "=== Atualizando CRM Evolution para v1.0.3 ==="

# Verificar se estamos no modo Swarm
if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active"; then
    echo "ERRO: Docker Swarm não está ativo!"
    echo "Execute: docker swarm init"
    exit 1
fi

# Verificar se a stack existe
if ! docker stack ls --format '{{.Name}}' | grep -q "crm-evolution"; then
    echo "ERRO: Stack 'crm-evolution' não encontrada!"
    echo "Execute primeiro: ./deploy-swarm.sh"
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "ERRO: Arquivo .env não encontrado!"
    echo "Copie env.swarm.example para .env e configure as variáveis"
    exit 1
fi

# Carregar variáveis de ambiente
echo "Carregando variáveis de ambiente..."
export $(grep -v '^#' .env | xargs)

# Verificar se DOMAIN está definida
if [ -z "$DOMAIN" ]; then
    echo "ERRO: Variável DOMAIN não definida no .env!"
    exit 1
fi

echo "Domínio configurado: $DOMAIN"

# Fazer pull da nova imagem
echo "Fazendo pull da nova imagem..."
if ! docker pull automacaodebaixocusto/crm:v1.0.3; then
    echo "ERRO: Falha ao fazer pull da imagem!"
    exit 1
fi

# Atualizar o serviço
echo "Atualizando o serviço..."
if ! docker stack deploy -c docker-stack.yml crm-evolution; then
    echo "ERRO: Falha ao atualizar o serviço!"
    exit 1
fi

# Aguardar um pouco para o serviço inicializar
echo "Aguardando inicialização do serviço..."
sleep 10

# Verificar status do serviço
echo "Verificando status do serviço..."
docker service ls | grep crm-evolution

# Verificar logs
echo "Últimos logs do serviço:"
docker service logs crm-evolution_crm-evolution --tail 20

echo ""
echo "=== Atualização concluída! ==="
echo "Acesse: https://$DOMAIN"
echo "Para ver logs em tempo real: docker service logs -f crm-evolution_crm-evolution"
