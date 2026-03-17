@echo off
setlocal
title DMS - Development (192.168.70.23)
echo =========================================================
echo   Pornire aplicatie DMS (Mod Development) ...
echo   IP: 192.168.70.23:3000
echo =========================================================
echo.

set "REPO=d:\Proiecte\dms"
cd /d "%REPO%" || (
  echo [ERROR] Nu pot accesa folderul proiectului: %REPO%
  exit /b 1
)

where npm >nul 2>nul || (
  echo [ERROR] npm nu este disponibil in PATH.
  exit /b 1
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
  echo [ERROR] Portul 3000 este deja ocupat de PID %%P.
  echo [INFO] Opreste procesul existent sau schimba portul.
  exit /b 1
)

npm run dev -- -H 0.0.0.0 -p 3000
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" echo [ERROR] next dev s-a oprit cu cod %EC%.

pause
exit /b %EC%
