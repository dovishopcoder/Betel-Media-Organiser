@echo off
setlocal

echo.
echo ============================================
echo  Betel Media - reset ecrane la fundal
echo ============================================
echo.

powershell -ExecutionPolicy Bypass -Command "try { Invoke-RestMethod -Uri 'http://localhost:3000/api/live/reset' -Method Post | Out-Null; Write-Host 'Ecranele au fost resetate la fundal.' } catch { Write-Host 'Aplicatia nu pare pornita. Ruleaza mai intai 3_PORNESTE_BETEL_MEDIA.bat'; Write-Host $_.Exception.Message }"
pause
