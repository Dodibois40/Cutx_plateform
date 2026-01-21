# CutX Process Cleanup Script
# Kills ONLY node processes related to CutX, not VSCode/Claude

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== CutX Process Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Get all node processes with their command lines
$allNodeProcesses = Get-WmiObject Win32_Process -Filter "name='node.exe'"
Write-Host "Total node processes: $($allNodeProcesses.Count)" -ForegroundColor Yellow

# Filter only CutX-related processes
$cutxProcesses = $allNodeProcesses | Where-Object {
    $_.CommandLine -match "cutx|CutX|cutx-api|cutx-frontend"
}

Write-Host "CutX processes found: $($cutxProcesses.Count)" -ForegroundColor Yellow
Write-Host ""

if ($cutxProcesses.Count -gt 0) {
    foreach ($proc in $cutxProcesses) {
        Write-Host "Killing PID $($proc.ProcessId)..." -ForegroundColor Gray
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Write-Host ""
    Write-Host "Killed $($cutxProcesses.Count) CutX processes" -ForegroundColor Green
} else {
    Write-Host "No CutX processes to kill" -ForegroundColor Gray
}

# Also kill processes on ports 3000 and 3001
Write-Host ""
Write-Host "Checking ports 3000/3001..." -ForegroundColor Yellow

$port3001 = netstat -ano | Select-String ":3001.*LISTENING"
$port3000 = netstat -ano | Select-String ":3000.*LISTENING"

foreach ($line in $port3001) {
    $pid = ($line -split '\s+')[-1]
    if ($pid -match '^\d+$') {
        Write-Host "Killing process on port 3001 (PID: $pid)" -ForegroundColor Gray
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

foreach ($line in $port3000) {
    $pid = ($line -split '\s+')[-1]
    if ($pid -match '^\d+$') {
        Write-Host "Killing process on port 3000 (PID: $pid)" -ForegroundColor Gray
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Cyan

# Show remaining node processes
Start-Sleep -Seconds 2
$remaining = (Get-Process node -ErrorAction SilentlyContinue).Count
Write-Host "Remaining node processes: $remaining" -ForegroundColor White
