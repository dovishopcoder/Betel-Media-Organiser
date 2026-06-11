@echo off
setlocal
cd /d "%~dp0"

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\launch-screen.ps1" -Route main-screen -DisplayPosition left -Kiosk
