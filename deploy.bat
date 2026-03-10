@echo off
title DMS - Deployment Tool
echo =========================================================
echo   Deployment DMS (Git - Build - Start)
echo =========================================================
echo.

cd /d d:\Proiecte\dms

echo [1/3] Preluare cod nou din Git...
git pull origin main

echo.
echo [2/3] Compilare aplicatie...
call npm run build

echo.
echo [3/3] Pornire aplicatie...
node .next\standalone\server.js

pause
