@echo off
setlocal
title DMS - Deployment Tool
echo =========================================================
echo   Deployment DMS (Git - Build - Start)
echo =========================================================
echo.

set "REPO=d:\Proiecte\dms"
set "SERVER_FILE=%REPO%\.next\standalone\server.js"

cd /d "%REPO%" || (
  echo [ERROR] Nu pot accesa folderul proiectului: %REPO%
  exit /b 1
)

where git >nul 2>nul || (
  echo [ERROR] git nu este disponibil in PATH.
  exit /b 1
)

where npm >nul 2>nul || (
  echo [ERROR] npm nu este disponibil in PATH.
  exit /b 1
)

echo [1/3] Preluare cod nou din Git...
git pull origin main
if errorlevel 1 (
  echo [ERROR] git pull a esuat.
  exit /b 1
)

echo.
echo [2/3] Compilare aplicatie...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build-ul a esuat.
  exit /b 1
)

if not exist "%SERVER_FILE%" (
  echo [ERROR] Build-ul s-a terminat, dar lipseste: %SERVER_FILE%
  exit /b 1
)

echo.
echo [3/3] Pornire aplicatie...
node "%SERVER_FILE%"
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" echo [ERROR] Serverul s-a oprit cu cod %EC%.

pause
exit /b %EC%
