@echo off
echo === Restarting CutX Servers ===
echo.

echo [1/4] Stopping existing processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 3 /nobreak >nul

echo [2/4] Clearing Next.js cache...
rmdir /s /q "c:\CutX_plateform\cutx-frontend\.next" 2>nul

echo [3/4] Starting API server...
start "CutX API" cmd /k "cd /d c:\CutX_plateform\cutx-api && npm run start:dev"
timeout /t 5 /nobreak >nul

echo [4/4] Starting Frontend server...
start "CutX Frontend" cmd /k "cd /d c:\CutX_plateform\cutx-frontend && npm run dev"

echo.
echo === Servers started in separate windows ===
echo API: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
pause
