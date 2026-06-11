@echo off
setlocal
cd /d "%~dp0"

set LOGFILE=%~dp0diagnostic-betel-media.txt

echo Betel Media diagnostic > "%LOGFILE%"
echo Data/Ora: %date% %time% >> "%LOGFILE%"
echo Folder: %CD% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

echo === Fisiere principale === >> "%LOGFILE%"
dir /b *.bat >> "%LOGFILE%" 2>&1
echo. >> "%LOGFILE%"

echo === Node === >> "%LOGFILE%"
where node >> "%LOGFILE%" 2>&1
node -v >> "%LOGFILE%" 2>&1
echo. >> "%LOGFILE%"

echo === npm === >> "%LOGFILE%"
where npm >> "%LOGFILE%" 2>&1
npm -v >> "%LOGFILE%" 2>&1
echo. >> "%LOGFILE%"

echo === Port 3000 === >> "%LOGFILE%"
netstat -ano | findstr :3000 >> "%LOGFILE%" 2>&1
echo. >> "%LOGFILE%"

echo === package.json === >> "%LOGFILE%"
if exist package.json (
  type package.json >> "%LOGFILE%" 2>&1
) else (
  echo package.json lipseste >> "%LOGFILE%"
)
echo. >> "%LOGFILE%"

echo === API bootstrap daca serverul ruleaza === >> "%LOGFILE%"
powershell -ExecutionPolicy Bypass -Command "try { Invoke-RestMethod -Uri 'http://localhost:3000/api/bootstrap' -TimeoutSec 5 | ConvertTo-Json -Depth 3 } catch { $_.Exception.Message }" >> "%LOGFILE%" 2>&1
echo. >> "%LOGFILE%"

echo === Ultimele loguri server === >> "%LOGFILE%"
if exist logs\server-output.log (
  echo --- server-output.log --- >> "%LOGFILE%"
  powershell -ExecutionPolicy Bypass -Command "Get-Content 'logs\server-output.log' -Tail 80" >> "%LOGFILE%" 2>&1
)
if exist logs\server-error.log (
  echo --- server-error.log --- >> "%LOGFILE%"
  powershell -ExecutionPolicy Bypass -Command "Get-Content 'logs\server-error.log' -Tail 80" >> "%LOGFILE%" 2>&1
)

echo.
echo Diagnosticul a fost creat aici:
echo %LOGFILE%
echo.
notepad "%LOGFILE%"
pause
