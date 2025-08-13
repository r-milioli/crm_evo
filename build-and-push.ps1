# Script para build e push da imagem Docker (PowerShell)
# Uso: .\build-and-push.ps1 [version]

param(
    [string]$Version = "latest"
)

# Configurações
$ImageName = "automacaodebaixocusto/crm"

Write-Host "🚀 Iniciando build da imagem Docker..." -ForegroundColor Green
Write-Host "📦 Nome da imagem: $ImageName" -ForegroundColor Cyan
Write-Host "🏷️  Versão: $Version" -ForegroundColor Cyan

# Build da imagem
Write-Host "🔨 Construindo imagem..." -ForegroundColor Yellow
docker build -t "$ImageName`:$Version" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build da imagem" -ForegroundColor Red
    exit 1
}

# Tag como latest se não for a versão latest
if ($Version -ne "latest") {
    Write-Host "🏷️  Adicionando tag latest..." -ForegroundColor Yellow
    docker tag "$ImageName`:$Version" "$ImageName`:latest"
}

# Push para Docker Hub
Write-Host "📤 Fazendo push para Docker Hub..." -ForegroundColor Yellow
docker push "$ImageName`:$Version"

if ($Version -ne "latest") {
    docker push "$ImageName`:latest"
}

Write-Host "✅ Build e push concluídos com sucesso!" -ForegroundColor Green
Write-Host "🐳 Imagem disponível em: $ImageName`:$Version" -ForegroundColor Cyan
