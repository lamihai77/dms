@echo off
title DMS - Deployment Tool
echo =========================================================
echo   Automatizare Deployment DMS (Git - Build - PM2)
echo =========================================================
echo.

echo [1/4] Preluare cod nou din Git...
git pull origin main

echo.
echo [2/4] Instalare dependinte (daca e cazul)...
call npm install

echo.
echo [3/4] Compilare aplicatie (Next.js Build)...
call npm run build

echo.
echo [4/4] Restartare aplicatie in PM2...
C:\Users\%USERNAME%\AppData\Roaming\npm\pm2.cmd restart ecosystem.config.js --update-env

echo.
echo =========================================================
echo   Deployment Finalizat cu Succes!
echo =========================================================
echo.
pause
