@echo off
title DMS - Productie
echo =========================================================
echo   Pornire aplicatie DMS pe IP: 192.168.70.23 PORT: 3000
echo =========================================================
echo.

cd /d d:\Proiecte\dms

echo Sincronizare configuratie...
copy /Y .env.local .next\standalone\.env.local >nul

echo Pornire server...
node .next\standalone\server.js

pause
