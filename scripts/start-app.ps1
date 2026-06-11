param(
  [int]$Port = 3000
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

function Stop-AppOnPort {
  param([int]$PortNumber)

  $portLines = netstat -ano | Select-String ":$PortNumber" | Where-Object { $_.Line -match "LISTENING" }
  $processIds = @()
  foreach ($line in $portLines) {
    $parts = ($line.Line -split "\s+") | Where-Object { $_ }
    if ($parts.Length -ge 5) {
      $processIds += [int]$parts[-1]
    }
  }

  $processIds = $processIds | Sort-Object -Unique
  foreach ($processId in $processIds) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

$logDir = Join-Path $projectRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stdoutLogPath = Join-Path $logDir "server-output.log"
$stderrLogPath = Join-Path $logDir "server-error.log"

Stop-AppOnPort -PortNumber $Port
Start-Sleep -Seconds 1

Start-Process -FilePath node -ArgumentList "server.js" -WorkingDirectory $projectRoot -RedirectStandardOutput $stdoutLogPath -RedirectStandardError $stderrLogPath -WindowStyle Hidden
Start-Sleep -Seconds 4

$url = "http://localhost:$Port/control"
Start-Process $url
Write-Host "Betel Media Organiser is available at $url"
Write-Host "Server logs:"
Write-Host $stdoutLogPath
Write-Host $stderrLogPath
