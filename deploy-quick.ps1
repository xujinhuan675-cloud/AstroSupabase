# Vercel Quick Deploy Script
# Usage: 
#   .\deploy-quick.ps1        # Deploy to production
#   .\deploy-quick.ps1 dev    # Deploy to preview
param(
    [Parameter(Position=0)]
    [string]$Environment = 'prod'
)

# Change to project directory
Set-Location "F:\IOTO-Doc\AstroSupabase"

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Deploying to Vercel..." -ForegroundColor Cyan

if ($Environment -eq 'dev' -or $Environment -eq 'preview') {
    vercel
} else {
    vercel --prod
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy succeeded!" -ForegroundColor Green
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
}
