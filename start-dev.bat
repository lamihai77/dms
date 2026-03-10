@echo off
title DMS - Development (192.168.70.23)
echo =========================================================
echo   Pornire aplicatie DMS (Mod Development) ...
echo   IP: 192.168.70.23:3000
echo =========================================================
echo.
cd /d d:\Proiecte\dms
npm run dev -- -H 0.0.0.0 -p 3000
pause
