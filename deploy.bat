@echo off
title DMS - Deployment Tool
echo =========================================================
echo   Automatizare Deployment DMS (Git - Build - PM2)
echo =========================================================
echo.

echo [1/4] Preluare cod nou din Git...
git pull origin main

echo.
echo [2/4] Oprire completa PM2...
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd kill

echo.
echo [3/4] Compilare aplicatie (Next.js Build)...
call npm run build

echo.
echo [4/4] Pornire aplicatie in PM2...
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd start ecosystem.config.js
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd save

echo.
echo =========================================================
echo   Deployment Finalizat! Status:
echo =========================================================
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd list
pause
