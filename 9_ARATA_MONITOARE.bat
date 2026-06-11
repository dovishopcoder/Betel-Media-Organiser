@echo off
setlocal

echo.
echo ============================================
echo  Betel Media - monitoare detectate
echo ============================================
echo.

powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { Write-Host ($_.DeviceName + ' Primary=' + $_.Primary + ' Bounds=' + $_.Bounds.X + ',' + $_.Bounds.Y + ' ' + $_.Bounds.Width + 'x' + $_.Bounds.Height) }"
echo.
echo Configurare biserica:
echo DISPLAY1 = Sala
echo DISPLAY2 = Operator
echo DISPLAY3 = Scena
echo.
pause
