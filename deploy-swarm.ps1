# Script de deploy para Docker Swarm
# Uso: .\deploy-swarm.ps1 [stack-name]

param(
    [string]$StackName = "crm-evolution"
)

Write-Host "🚀 Iniciando deploy do CRM Evolution no Docker Swarm..." -ForegroundColor Green

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "📝 Arquivo .env não encontrado. Copiando exemplo..." -ForegroundColor Yellow
    Copy-Item "env.swarm.example" ".env"
    Write-Host "⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações antes de continuar!" -ForegroundColor Red
    Write-Host "   - Configure DATABASE_URL (seu PostgreSQL existente)" -ForegroundColor Yellow
    Write-Host "   - Configure JWT_SECRET" -ForegroundColor Yellow
    Write-Host "   - Configure DOMAIN" -ForegroundColor Yellow
    Write-Host "   - Configure EVOLUTION_API_URL e EVOLUTION_API_KEY" -ForegroundColor Yellow
    exit 1
}

# Verificar se Docker está rodando
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker não está rodando. Inicie o Docker e tente novamente." -ForegroundColor Red
    exit 1
}

# Verificar se está em modo Swarm
$swarmInfo = docker info --format "{{.Swarm.LocalNodeState}}"
if ($swarmInfo -ne "active") {
    Write-Host "🌐 Inicializando modo Swarm..." -ForegroundColor Yellow
    docker swarm init
}

# Verificar se a rede network_public existe
$networkExists = docker network ls --format "table {{.Name}}" | Select-String "network_public"
if (-not $networkExists) {
    Write-Host "🌐 Criando rede network_public..." -ForegroundColor Yellow
    docker network create --driver overlay --attachable network_public
}

# Verificar se a imagem existe localmente
$imageExists = docker images --format "table {{.Repository}}:{{.Tag}}" | Select-String "automacaodebaixocusto/crm:latest"
if (-not $imageExists) {
    Write-Host "📦 Imagem não encontrada localmente. Fazendo pull..." -ForegroundColor Yellow
    docker pull automacaodebaixocusto/crm:latest
}

# Deploy da stack
Write-Host "📦 Fazendo deploy da stack '$StackName'..." -ForegroundColor Yellow
docker stack deploy -c docker-stack.yml --env-file .env $StackName

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no deploy da stack" -ForegroundColor Red
    exit 1
}

# Aguardar serviços estarem prontos
Write-Host "⏳ Aguardando serviços estarem prontos..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verificar status da stack
Write-Host "🔍 Verificando status da stack..." -ForegroundColor Yellow
docker stack services $StackName

Write-Host ""
Write-Host "🎉 Deploy da stack concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Comandos úteis:" -ForegroundColor Cyan
Write-Host "   - Status da stack: docker stack services $StackName" -ForegroundColor White
Write-Host "   - Logs: docker service logs ${StackName}_crm-evolution" -ForegroundColor White
Write-Host "   - Logs em tempo real: docker service logs -f ${StackName}_crm-evolution" -ForegroundColor White
Write-Host "   - Remover stack: docker stack rm $StackName" -ForegroundColor White
Write-Host "   - Atualizar stack: docker stack deploy -c docker-stack.yml --env-file .env $StackName" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Verificar saúde:" -ForegroundColor Cyan
Write-Host "   - docker service ps ${StackName}_crm-evolution" -ForegroundColor White
Write-Host ""
