# Servidor local del mock (prototipo/) — http://127.0.0.1:8765
param(
  [switch]$Build,
  [int]$Port = 8765,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PrototipoDir = Join-Path $RepoRoot "prototipo"
$MockUrl = "http://127.0.0.1:$Port/index.html"

function Test-CommandExists {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-Path $PrototipoDir)) {
  Write-Error "No se encontro la carpeta prototipo en $PrototipoDir"
}

if (-not (Test-CommandExists "python") -and -not (Test-CommandExists "py")) {
  Write-Error "Falta Python 3 (python o py -3 en PATH)."
}

if ($Build) {
  Write-Host "Regenerando bundle del mock..." -ForegroundColor Yellow
  & (Join-Path $PrototipoDir "build-mock.ps1")
  if ($LASTEXITCODE -ne 0) {
    Write-Error "build-mock.ps1 fallo."
  }
}

Write-Host "Mock local — Gestor de flujos" -ForegroundColor Cyan
Write-Host "URL: $MockUrl" -ForegroundColor Green
Write-Host "Ctrl+C para detener el servidor." -ForegroundColor DarkGray
Write-Host ""

if (-not $NoBrowser) {
  Start-Process $MockUrl
}

Push-Location $PrototipoDir
try {
  if (Test-CommandExists "python") {
    python -m http.server $Port
  } else {
    py -3 -m http.server $Port
  }
} finally {
  Pop-Location
}
