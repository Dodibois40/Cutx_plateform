# CutX Dev Servers - Stop Script (PowerShell)
# Usage: Right-click > "Run with PowerShell" or: powershell -ExecutionPolicy Bypass -File dev-stop.ps1

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== Stopping CutX Dev Servers ===" -ForegroundColor Cyan
Write-Host ""

# Find and kill processes on port 3001 (API)
Write-Host "[API] Checking port 3001..." -ForegroundColor Yellow
$apiPids = netstat -ano | Select-String ":3001.*LISTENING" | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Select-Object -Unique

if ($apiPids) {
    foreach ($pid in $apiPids) {
        if ($pid -match '^\d+$') {
            Write-Host "  Stopping process $pid" -ForegroundColor Gray
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "[API] Stopped" -ForegroundColor Green
} else {
    Write-Host "[API] Not running" -ForegroundColor Gray
}

# Find and kill processes on port 3000 (Frontend)
Write-Host "[Frontend] Checking port 3000..." -ForegroundColor Yellow
$frontendPids = netstat -ano | Select-String ":3000.*LISTENING" | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Select-Object -Unique

if ($frontendPids) {
    foreach ($pid in $frontendPids) {
        if ($pid -match '^\d+$') {
            Write-Host "  Stopping process $pid" -ForegroundColor Gray
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "[Frontend] Stopped" -ForegroundColor Green
} else {
    Write-Host "[Frontend] Not running" -ForegroundColor Gray
}

# Close any cmd windows with CutX in title
Get-Process cmd -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -match "CutX"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
