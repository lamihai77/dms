@echo off
title DMS - Deployment Tool
echo =========================================================
echo   Automatizare Deployment DMS (Git - Build - PM2)
echo =========================================================
echo.

echo [1/5] Preluare cod nou din Git...
git pull origin main

echo.
echo [2/5] Oprire aplicatie (elibereaza fisierele blocate)...
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd stop dms-admin

echo.
echo [3/5] Instalare dependinte (daca e cazul)...
call npm install

echo.
echo [4/5] Compilare aplicatie (Next.js Build)...
call npm run build

echo.
echo [5/5] Restartare aplicatie in PM2...
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd restart dms-admin

echo.
echo =========================================================
echo   Deployment Finalizat cu Succes!
echo =========================================================
echo.
pause
