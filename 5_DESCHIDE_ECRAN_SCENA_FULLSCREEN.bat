@echo off
setlocal
cd /d "%~dp0"

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\launch-screen.ps1" -Route stage-screen -Role stage -DisplayIndex 3 -Kiosk
