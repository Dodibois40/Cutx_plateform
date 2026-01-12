@echo off
setlocal

echo === CutX Server Manager ===

:: Check if API is already running
curl -s --connect-timeout 2 http://localhost:3001/api/health >nul 2>&1
if %errorlevel%==0 (
    echo [API] Already running on port 3001
    set API_RUNNING=1
) else (
    echo [API] Starting...
    start "CutX API" cmd /k "cd /d c:\CutX_plateform\cutx-api && npm run start:dev"
    set API_RUNNING=0
)

:: Wait a bit before checking frontend
timeout /t 2 /nobreak >nul

:: Check if Frontend is already running
curl -s --connect-timeout 2 http://localhost:3000 >nul 2>&1
if %errorlevel%==0 (
    echo [Frontend] Already running on port 3000
) else (
    echo [Frontend] Starting...
    start "CutX Frontend" cmd /k "cd /d c:\CutX_plateform\cutx-frontend && npm run dev"
)

echo.
echo === Status ===
echo API: http://localhost:3001
echo Frontend: http://localhost:3000
