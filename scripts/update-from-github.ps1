param(
  [string]$RepositoryZipUrl = "https://github.com/dovishopcoder/Betel-Media-Organiser/archive/refs/heads/main.zip",
  [int]$Port = 3000,
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$tempRoot = Join-Path $env:TEMP ("betel-media-update-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$zipPath = Join-Path $tempRoot "latest.zip"
$extractPath = Join-Path $tempRoot "extract"

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

Write-Host "Se opreste aplicatia daca ruleaza pe portul $Port..."
Stop-AppOnPort -PortNumber $Port

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $extractPath | Out-Null

Write-Host "Se descarca ultima versiune de pe GitHub..."
Invoke-WebRequest -Uri $RepositoryZipUrl -OutFile $zipPath -UseBasicParsing

Write-Host "Se extrage pachetul..."
Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force

$sourceRoot = Get-ChildItem -LiteralPath $extractPath -Directory | Select-Object -First 1
if (-not $sourceRoot) {
  throw "Nu s-a gasit folderul extras din arhiva GitHub."
}

$excludedNames = @(".git", ".next", "node_modules", "portable", "data", "media")

Write-Host "Se copiaza fisierele aplicatiei. Datele si media locale se pastreaza..."
Get-ChildItem -LiteralPath $sourceRoot.FullName -Force | ForEach-Object {
  if ($excludedNames -contains $_.Name) {
    return
  }

  $destination = Join-Path $projectRoot $_.Name
  if ($_.PSIsContainer) {
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
  } else {
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
  }
}

Write-Host "Se actualizeaza dependintele..."
Set-Location $projectRoot
npm install

if (-not $NoStart) {
  Write-Host "Se porneste aplicatia..."
  powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\start-app.ps1") -Port $Port
}

Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Actualizarea este gata."
