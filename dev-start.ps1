# CutX Dev Servers - Start Script (PowerShell)
# Usage: Right-click > "Run with PowerShell" or: powershell -ExecutionPolicy Bypass -File dev-start.ps1

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== CutX Dev Servers ===" -ForegroundColor Cyan
Write-Host ""

# Check if API is already running
$apiRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $apiRunning = $true
        Write-Host "[API] Already running on port 3001" -ForegroundColor Green
    }
} catch {}

# Check if Frontend is already running
$frontendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing
    if ($response.StatusCode -in 200, 307, 308) {
        $frontendRunning = $true
        Write-Host "[Frontend] Already running on port 3000" -ForegroundColor Green
    }
} catch {}

# Start API if not running
if (-not $apiRunning) {
    Write-Host "[API] Starting..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d c:\CutX_plateform\cutx-api && npm run start:dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

# Start Frontend if not running
if (-not $frontendRunning) {
    Write-Host "[Frontend] Starting..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d c:\CutX_plateform\cutx-frontend && npm run dev" -WindowStyle Normal
}

Write-Host ""
Write-Host "=== Status ===" -ForegroundColor Cyan
Write-Host "API:      http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Servers started in separate windows." -ForegroundColor Green
