# Script para configurar o webhook do Telegram
# Execute: .\scripts\setup-webhook.ps1

# SUBSTITUA ESTES VALORES:
$BOT_TOKEN = "SEU_TOKEN_DO_BOTFATHER"
$VERCEL_URL = "https://seu-projeto.vercel.app"

# Configurar webhook
$webhookUrl = "$VERCEL_URL/api/telegram/webhook"
$apiUrl = "https://api.telegram.org/bot$BOT_TOKEN/setWebhook"

Write-Host "Configurando webhook para: $webhookUrl" -ForegroundColor Cyan

$body = @{
    url = $webhookUrl
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"

if ($response.ok) {
    Write-Host "Webhook configurado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Erro ao configurar webhook:" -ForegroundColor Red
    Write-Host $response.description
}

# Verificar configuracao
Write-Host "`nVerificando configuracao..." -ForegroundColor Cyan
$infoUrl = "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
$info = Invoke-RestMethod -Uri $infoUrl -Method Get

Write-Host "URL do webhook: $($info.result.url)"
Write-Host "Pendentes: $($info.result.pending_update_count)"
if ($info.result.last_error_message) {
    Write-Host "Ultimo erro: $($info.result.last_error_message)" -ForegroundColor Yellow
}
