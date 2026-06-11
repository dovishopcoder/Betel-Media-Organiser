@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo  Betel Media - creare pachet pentru flash
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nu este instalat pe acest calculator.
  echo Instaleaza Node.js LTS de la https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm nu este disponibil. Reinstaleaza Node.js LTS.
  pause
  exit /b 1
)

call npm run package:portable
if errorlevel 1 (
  echo.
  echo Nu s-a putut crea pachetul.
  pause
  exit /b 1
)

echo.
echo Pachetul ZIP a fost creat in folderul portable.
echo Copiaza ultimul fisier .zip din portable pe flash.
echo.
start "" "%~dp0portable"
pause
