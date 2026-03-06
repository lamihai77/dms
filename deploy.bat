@echo off
title DMS - Deployment Tool
echo =========================================================
echo   Automatizare Deployment DMS (Git - Build - PM2)
echo =========================================================
echo.

echo [1/6] Preluare cod nou din Git...
git pull origin main

echo.
echo [2/6] Oprire completa PM2 (elibereaza toate fisierele)...
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd kill

echo.
echo [3/6] Stergere node_modules (evita erori EPERM)...
cmd /c "rmdir /S /Q node_modules"

echo.
echo [4/6] Instalare dependinte...
call npm install

echo.
echo [5/6] Compilare aplicatie (Next.js Build)...
call npm run build

echo.
echo [6/6] Pornire aplicatie in PM2...
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd start ecosystem.config.js
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd save

echo.
echo =========================================================
echo   Deployment Finalizat! Verifica: pm2 list
echo =========================================================
echo.
pause
