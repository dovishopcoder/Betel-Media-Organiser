@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo  Betel Media - instalare pe acest calculator
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nu este instalat.
  echo.
  echo Instaleaza Node.js LTS de la:
  echo https://nodejs.org/
  echo.
  echo Dupa instalare, inchide aceasta fereastra si ruleaza din nou acest fisier.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm nu este disponibil. Reinstaleaza Node.js LTS.
  pause
  exit /b 1
)

echo Se instaleaza dependintele aplicatiei...
call npm install
if errorlevel 1 (
  echo.
  echo Instalarea nu a reusit. Verifica internetul si incearca din nou.
  pause
  exit /b 1
)

echo.
echo Instalarea este gata.
echo De acum poti porni aplicatia cu:
echo 3_PORNESTE_BETEL_MEDIA.bat
echo.
pause
