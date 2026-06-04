param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputDir,

  [int]$Width = 1920,

  [int]$Height = 1080
)

$resolvedInput = Resolve-Path -LiteralPath $InputPath -ErrorAction Stop
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$powerPoint = $null
$presentation = $null

try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $presentation = $powerPoint.Presentations.Open($resolvedInput.Path, $true, $true, $false)

  for ($index = 1; $index -le $presentation.Slides.Count; $index++) {
    $outputPath = Join-Path $OutputDir ("slide-{0}.png" -f $index)
    $presentation.Slides.Item($index).Export($outputPath, "PNG", $Width, $Height)
  }

  Write-Output $presentation.Slides.Count
} finally {
  if ($presentation -ne $null) {
    $presentation.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
  }

  if ($powerPoint -ne $null) {
    $powerPoint.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
