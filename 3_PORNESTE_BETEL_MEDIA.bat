@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo  Betel Media - pornire aplicatie
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nu este instalat. Ruleaza mai intai fisierul de instalare.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependintele lipsesc.
  echo Ruleaza mai intai: 2_INSTALEAZA_PE_CALCULATORUL_BISERICII.bat
  pause
  exit /b 1
)

call npm run start:windows
echo.
echo Daca browserul nu s-a deschis automat, intra manual pe:
echo http://localhost:3000/control
echo.
pause
