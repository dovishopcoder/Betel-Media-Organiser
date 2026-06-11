param(
  [ValidateSet("main-screen", "stage-screen", "control")]
  [string]$Route = "main-screen",

  [ValidateSet("primary", "secondary")]
  [string]$Display = "secondary",

  [int]$DisplayIndex = 0,

  [switch]$Kiosk,

  [int]$Port = 3000
)

Add-Type -AssemblyName System.Windows.Forms

$screens = [System.Windows.Forms.Screen]::AllScreens

$targetScreen = $null
if ($DisplayIndex -gt 0) {
  $targetScreen = $screens | Where-Object { $_.DeviceName -match "DISPLAY$DisplayIndex$" } | Select-Object -First 1
  if (-not $targetScreen -and $screens.Length -ge $DisplayIndex) {
    $targetScreen = $screens[$DisplayIndex - 1]
  }
}

if (-not $targetScreen) {
  $targetScreen = if ($Display -eq "primary") {
    $screens | Where-Object { $_.Primary } | Select-Object -First 1
  } else {
    $screens | Where-Object { -not $_.Primary } | Select-Object -First 1
  }
}

if (-not $targetScreen) {
  $targetScreen = $screens | Select-Object -First 1
}

if (-not $targetScreen) {
  throw "Nu s-a gasit niciun monitor conectat."
}

Write-Host "Se deschide $Route pe $($targetScreen.DeviceName) la $($targetScreen.Bounds.X),$($targetScreen.Bounds.Y) $($targetScreen.Bounds.Width)x$($targetScreen.Bounds.Height)"

$edgeCandidates = @(
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe"
)

$edgePath = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $edgePath) {
  throw "Microsoft Edge was not found. Install Edge or update scripts/launch-screen.ps1 with your browser path."
}

$url = "http://localhost:$Port/$Route"
$bounds = $targetScreen.Bounds
$profileDir = Join-Path $env:TEMP "betel-media-$Route"

$arguments = @(
  "--new-window",
  "--user-data-dir=$profileDir",
  "--no-first-run",
  "--autoplay-policy=no-user-gesture-required",
  "--window-position=$($bounds.X),$($bounds.Y)",
  "--window-size=$($bounds.Width),$($bounds.Height)"
)

if ($Kiosk) {
  $arguments += @(
    "--kiosk",
    $url,
    "--edge-kiosk-type=fullscreen"
  )
} else {
  $arguments += @(
    "--app=$url",
    "--start-fullscreen"
  )
}

Start-Process -FilePath $edgePath -ArgumentList $arguments
