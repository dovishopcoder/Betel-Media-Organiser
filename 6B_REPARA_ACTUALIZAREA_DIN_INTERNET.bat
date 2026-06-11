@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo  Betel Media - reparare actualizare
echo ============================================
echo.
echo Acest fisier descarca scriptul nou de update si il ruleaza.
echo.

if not exist "scripts" mkdir "scripts"

powershell -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/dovishopcoder/Betel-Media-Organiser/main/scripts/update-from-github.ps1' -OutFile 'scripts\update-from-github.ps1' -UseBasicParsing; Write-Host 'Scriptul de update a fost descarcat.' } catch { Write-Host 'Nu s-a putut descarca scriptul de update.'; Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
  pause
  exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\update-from-github.ps1"
pause
