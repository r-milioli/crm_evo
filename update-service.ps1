# Script para atualizar o serviço CRM Evolution no Docker Swarm
# Autor: Assistente
# Data: 2025-08-12

Write-Host "=== Atualizando CRM Evolution para v1.0.3 ===" -ForegroundColor Green

# Verificar se estamos no modo Swarm
$swarmInfo = docker info --format '{{.Swarm.LocalNodeState}}' 2>$null
if ($swarmInfo -ne "active") {
    Write-Host "ERRO: Docker Swarm não está ativo!" -ForegroundColor Red
    Write-Host "Execute: docker swarm init" -ForegroundColor Yellow
    exit 1
}

# Verificar se a stack existe
$stackExists = docker stack ls --format '{{.Name}}' | Select-String "crm-evolution"
if (-not $stackExists) {
    Write-Host "ERRO: Stack 'crm-evolution' não encontrada!" -ForegroundColor Red
    Write-Host "Execute primeiro: ./deploy-swarm.ps1" -ForegroundColor Yellow
    exit 1
}

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "ERRO: Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "Copie env.swarm.example para .env e configure as variáveis" -ForegroundColor Yellow
    exit 1
}

# Carregar variáveis de ambiente
Write-Host "Carregando variáveis de ambiente..." -ForegroundColor Blue
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        Set-Item -Path "env:$name" -Value $value
    }
}

# Verificar se DOMAIN está definida
if (-not $env:DOMAIN) {
    Write-Host "ERRO: Variável DOMAIN não definida no .env!" -ForegroundColor Red
    exit 1
}

Write-Host "Domínio configurado: $env:DOMAIN" -ForegroundColor Cyan

# Fazer pull da nova imagem
Write-Host "Fazendo pull da nova imagem..." -ForegroundColor Blue
docker pull automacaodebaixocusto/crm:v1.0.3
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao fazer pull da imagem!" -ForegroundColor Red
    exit 1
}

# Atualizar o serviço
Write-Host "Atualizando o serviço..." -ForegroundColor Blue
docker stack deploy -c docker-stack.yml crm-evolution
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao atualizar o serviço!" -ForegroundColor Red
    exit 1
}

# Aguardar um pouco para o serviço inicializar
Write-Host "Aguardando inicialização do serviço..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Verificar status do serviço
Write-Host "Verificando status do serviço..." -ForegroundColor Blue
docker service ls | Select-String "crm-evolution"

# Verificar logs
Write-Host "Últimos logs do serviço:" -ForegroundColor Blue
docker service logs crm-evolution_crm-evolution --tail 20

Write-Host "`n=== Atualização concluída! ===" -ForegroundColor Green
Write-Host "Acesse: https://$env:DOMAIN" -ForegroundColor Cyan
Write-Host "Para ver logs em tempo real: docker service logs -f crm-evolution_crm-evolution" -ForegroundColor Yellow
