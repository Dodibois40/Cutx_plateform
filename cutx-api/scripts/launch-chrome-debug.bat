@echo off
echo ====================================
echo  CHROME DEBUG MODE - B COMME BOIS
echo ====================================
echo.

echo Fermeture de tous les processus Chrome...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Lancement de Chrome avec le port de debug 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug-profile"

echo.
echo Chrome demarre avec le port de debug 9222
echo.
echo ====================================
echo  INSTRUCTIONS
echo ====================================
echo.
echo 1. Dans Chrome, va sur https://www.bcommebois.fr
echo 2. Connecte-toi avec ton compte client
echo 3. Accepte les cookies si demande
echo 4. Reviens ici et appuie sur une touche
echo.
echo ====================================
pause

echo.
echo Lancement du script de scraping...
cd /d "%~dp0\.."
npx tsx scripts/scrape-panneaux-deco.ts
pause
