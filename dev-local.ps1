# Astro Supabase Blog - Local Development Startup Script
# Function: Set environment variables and start development server

# Switch to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Hybrid Blog Dev Mode          " -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Set required environment variables
$env:PWD = Get-Location
$env:NODE_ENV = "development"
$env:SPACESHIP_AUTHOR = "My Vault"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host ("  - PWD: " + $env:PWD)
Write-Host "  - NODE_ENV: development"
Write-Host ("  - SPACESHIP_AUTHOR: " + $env:SPACESHIP_AUTHOR)
Write-Host "  - URL: http://localhost:4321"
Write-Host ""

Write-Host "Starting dev server..." -ForegroundColor Cyan
Write-Host ""

# Start development server
npm run dev

Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Yellow
Read-Host
