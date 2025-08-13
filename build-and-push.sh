#!/bin/bash

# Script para build e push da imagem Docker
# Uso: ./build-and-push.sh [version]

set -e

# Configurações
IMAGE_NAME="automacaodebaixocusto/crm"
VERSION=${1:-latest}

echo "🚀 Iniciando build da imagem Docker..."
echo "📦 Nome da imagem: $IMAGE_NAME"
echo "🏷️  Versão: $VERSION"

# Build da imagem
echo "🔨 Construindo imagem..."
docker build -t $IMAGE_NAME:$VERSION .

# Tag como latest se não for a versão latest
if [ "$VERSION" != "latest" ]; then
    echo "🏷️  Adicionando tag latest..."
    docker tag $IMAGE_NAME:$VERSION $IMAGE_NAME:latest
fi

# Push para Docker Hub
echo "📤 Fazendo push para Docker Hub..."
docker push $IMAGE_NAME:$VERSION

if [ "$VERSION" != "latest" ]; then
    docker push $IMAGE_NAME:latest
fi

echo "✅ Build e push concluídos com sucesso!"
echo "🐳 Imagem disponível em: $IMAGE_NAME:$VERSION"
