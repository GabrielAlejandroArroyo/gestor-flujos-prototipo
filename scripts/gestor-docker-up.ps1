# Docker Compose — gestor-app (imagen gestor-flujos-app)
param([switch]$Force)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")
. (Join-Path $PSScriptRoot "lib/platino-guard.ps1")

$GestorAppDir = Get-GestorAppDir -RepoRoot (Get-GestorRepoRoot -StartDir $PSScriptRoot)
Assert-GestorEnvNotAccuOne -GestorAppDir $GestorAppDir

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker no está en PATH. Instalá Docker Desktop y volvé a intentar."
}

$envFile = Join-Path $GestorAppDir ".env"
if (-not (Test-Path $envFile)) {
  Write-Host "No hay .env — ejecutá: .\scripts\gestor.ps1 env-init" -ForegroundColor Yellow
}

Push-Location $GestorAppDir
try {
  Write-Host "Docker Compose up --build (gestor-flujos)" -ForegroundColor Cyan
  docker compose up -d --build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host ""
  Write-Host "App:         http://localhost:3000" -ForegroundColor Green
  Write-Host "Integración: http://localhost:3000/integracion" -ForegroundColor Green
  Write-Host "Health:      http://localhost:3000/api/health" -ForegroundColor Green
  Write-Host ""
  Write-Host "Logs: .\scripts\gestor.ps1 docker-logs" -ForegroundColor DarkGray
} finally {
  Pop-Location
}
