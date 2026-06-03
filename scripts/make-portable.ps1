param(
  [string]$OutputDir = "portable"
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$projectName = Split-Path -Leaf $projectRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stagingRoot = Join-Path $projectRoot $OutputDir
$stagingDir = Join-Path $stagingRoot "$projectName-$timestamp"
$zipPath = Join-Path $stagingRoot "$projectName-$timestamp.zip"

$excludeDirs = @(
  ".git",
  ".next",
  "node_modules",
  "portable"
)

$excludeFiles = @(
  "*.log",
  "npm-debug.log*"
)

New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
if (Test-Path $stagingDir) {
  Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

Get-ChildItem -LiteralPath $projectRoot -Force | ForEach-Object {
  if ($excludeDirs -contains $_.Name) {
    return
  }

  $destination = Join-Path $stagingDir $_.Name
  if ($_.PSIsContainer) {
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
  } else {
    $skip = $false
    foreach ($pattern in $excludeFiles) {
      if ($_.Name -like $pattern) {
        $skip = $true
      }
    }
    if (-not $skip) {
      Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
    }
  }
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $stagingDir -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $stagingDir -Recurse -Force

Write-Host "Portable package created:"
Write-Host $zipPath
