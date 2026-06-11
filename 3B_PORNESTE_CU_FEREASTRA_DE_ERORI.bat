@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo  Betel Media - pornire cu fereastra de erori
echo ============================================
echo.
echo Aceasta fereastra ramane deschisa si arata erorile serverului.
echo Daca apare o eroare, fa poza si trimite-o.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nu este instalat.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependintele lipsesc.
  echo Ruleaza mai intai: 2_INSTALEAZA_PE_CALCULATORUL_BISERICII.bat
  pause
  exit /b 1
)

echo Se opreste orice server vechi de pe portul 3000...
powershell -ExecutionPolicy Bypass -Command "$lines = netstat -ano | Select-String ':3000' | Where-Object { $_.Line -match 'LISTENING' }; foreach ($line in $lines) { $parts = ($line.Line -split '\s+') | Where-Object { $_ }; if ($parts.Length -ge 5) { Stop-Process -Id ([int]$parts[-1]) -Force -ErrorAction SilentlyContinue } }"

echo.
echo Pornesc serverul vizibil...
echo Dupa ce vezi mesajul cu localhost:3000, deschide:
echo http://localhost:3000/control
echo.

node server.js

echo.
echo Serverul s-a oprit. Daca vezi eroare mai sus, trimite poza.
pause
