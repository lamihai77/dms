@echo off
setlocal
title DMS - Productie
echo =========================================================
echo   Pornire aplicatie DMS pe IP: 192.168.70.23 PORT: 3000
echo =========================================================
echo.

set "REPO=d:\Proiecte\dms"
set "SERVER_FILE=%REPO%\.next\standalone\server.js"
set "ENV_FILE=%REPO%\.env.local"
set "STANDALONE_DIR=%REPO%\.next\standalone"
set "NEXT_STATIC_SRC=%REPO%\.next\static"
set "NEXT_STATIC_DST=%STANDALONE_DIR%\.next\static"
set "PUBLIC_SRC=%REPO%\public"
set "PUBLIC_DST=%STANDALONE_DIR%\public"

cd /d "%REPO%" || (
  echo [ERROR] Nu pot accesa folderul proiectului: %REPO%
  exit /b 1
)

if not exist "%SERVER_FILE%" (
  echo [ERROR] Lipseste build-ul standalone: %SERVER_FILE%
  echo [INFO] Ruleaza mai intai: npm run build
  exit /b 1
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
  echo [WARN] Portul 3000 este deja ocupat de PID %%P.
)

if exist "%ENV_FILE%" (
  echo Sincronizare configuratie...
  copy /Y "%ENV_FILE%" "%STANDALONE_DIR%\.env.local" >nul
  if errorlevel 1 echo [WARN] Nu am putut copia .env.local in standalone.
) else (
  echo [WARN] Fisierul .env.local nu exista. Pornesc fara sincronizare env.
)

if exist "%NEXT_STATIC_SRC%" (
  echo Sincronizare assete Next static...
  if not exist "%NEXT_STATIC_DST%" mkdir "%NEXT_STATIC_DST%" >nul 2>&1
  robocopy "%NEXT_STATIC_SRC%" "%NEXT_STATIC_DST%" /E /NFL /NDL /NJH /NJS /NP >nul
  if errorlevel 8 (
    echo [WARN] Sincronizarea .next/static a raportat eroare.
  )
) else (
  echo [WARN] Lipseste sursa static: %NEXT_STATIC_SRC%
)

if exist "%PUBLIC_SRC%" (
  echo Sincronizare assete public...
  if not exist "%PUBLIC_DST%" mkdir "%PUBLIC_DST%" >nul 2>&1
  robocopy "%PUBLIC_SRC%" "%PUBLIC_DST%" /E /NFL /NDL /NJH /NJS /NP >nul
  if errorlevel 8 (
    echo [WARN] Sincronizarea public a raportat eroare.
  )
)

echo Pornire server...
node "%SERVER_FILE%"
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo [ERROR] Serverul s-a oprit cu cod %EC%.
)

pause
exit /b %EC%
