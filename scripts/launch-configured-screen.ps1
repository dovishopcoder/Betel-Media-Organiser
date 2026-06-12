param(
  [ValidateSet("operator", "main", "stage")]
  [string]$Target = "main",

  [int]$Port = 3000
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$configPath = Join-Path $projectRoot "data\screen-config.json"

$defaults = @{
  operator = 1
  main = 2
  stage = 3
}

$config = $defaults
if (Test-Path $configPath) {
  try {
    $saved = Get-Content $configPath -Raw | ConvertFrom-Json
    foreach ($key in @("operator", "main", "stage")) {
      if ($saved.$key -as [int]) {
        $config[$key] = [int]$saved.$key
      }
    }
  } catch {
    Write-Host "Nu s-a putut citi screen-config.json; folosesc setarea implicita."
  }
}

$route = switch ($Target) {
  "operator" { "control" }
  "main" { "main-screen" }
  "stage" { "stage-screen" }
}

if ($Target -eq "operator") {
  Start-Process "http://localhost:$Port/$route"
  exit 0
}

$launchArgs = @(
  "-ExecutionPolicy", "Bypass",
  "-File", (Join-Path $projectRoot "scripts\launch-screen.ps1"),
  "-Route", $route,
  "-DisplayIndex", $config[$Target],
  "-Port", $Port
)

$launchArgs += "-Kiosk"

powershell @launchArgs
