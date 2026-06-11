@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo  Betel Media - actualizare din internet
echo ============================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\update-from-github.ps1"
pause
