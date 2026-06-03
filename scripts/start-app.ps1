param(
  [int]$Port = 3000
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

$existing = netstat -ano | Select-String ":$Port" | Select-Object -First 1
if (-not $existing) {
  Start-Process -FilePath node -ArgumentList "server.js" -WorkingDirectory $projectRoot -WindowStyle Hidden
  Start-Sleep -Seconds 4
}

$url = "http://localhost:$Port/control"
Start-Process $url
Write-Host "Betel Media Organiser is available at $url"
