# CutX Dev Servers - Restart Script (PowerShell)
# Usage: Right-click > "Run with PowerShell" or: powershell -ExecutionPolicy Bypass -File dev-restart.ps1

$ErrorActionPreference = "SilentlyContinue"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Restarting CutX Dev Servers ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop servers
Write-Host "[1/3] Stopping servers..." -ForegroundColor Yellow

# Kill processes on port 3001 (API)
$apiPids = netstat -ano | Select-String ":3001.*LISTENING" | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Select-Object -Unique
foreach ($pid in $apiPids) {
    if ($pid -match '^\d+$') {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

# Kill processes on port 3000 (Frontend)
$frontendPids = netstat -ano | Select-String ":3000.*LISTENING" | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Select-Object -Unique
foreach ($pid in $frontendPids) {
    if ($pid -match '^\d+$') {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

# Close CutX cmd windows
Get-Process cmd -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -match "CutX"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Step 2: Clear Next.js cache (optional but recommended)
Write-Host "[2/3] Clearing Next.js cache..." -ForegroundColor Yellow
$nextCachePath = "c:\CutX_plateform\cutx-frontend\.next"
if (Test-Path $nextCachePath) {
    Remove-Item -Path $nextCachePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Cache cleared" -ForegroundColor Gray
} else {
    Write-Host "  No cache to clear" -ForegroundColor Gray
}

# Step 3: Start servers
Write-Host "[3/3] Starting servers..." -ForegroundColor Yellow

# Start API
Write-Host "  Starting API..." -ForegroundColor Gray
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title CutX API && cd /d c:\CutX_plateform\cutx-api && npm run start:dev" -WindowStyle Normal

Start-Sleep -Seconds 5

# Start Frontend
Write-Host "  Starting Frontend..." -ForegroundColor Gray
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title CutX Frontend && cd /d c:\CutX_plateform\cutx-frontend && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "=== Servers Started ===" -ForegroundColor Cyan
Write-Host "API:      http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Wait ~10 seconds for full startup." -ForegroundColor Gray
