# Import testing-bootstrap vía profile seed (requiere .env + Supabase + app healthy)
param([switch]$Force)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")
. (Join-Path $PSScriptRoot "lib/platino-guard.ps1")

$GestorAppDir = Get-GestorAppDir -RepoRoot (Get-GestorRepoRoot -StartDir $PSScriptRoot)
Assert-GestorEnvNotAccuOne -GestorAppDir $GestorAppDir

$envFile = Join-Path $GestorAppDir ".env"
if (-not (Test-Path $envFile)) {
  Write-Error "Falta $envFile — .\scripts\gestor.ps1 env-init"
}

if (-not (Confirm-DeployAction -Prompt "¿Ejecutar seed (import testing) contra Supabase del .env? (s/N)" -Force:$Force)) {
  Write-Host "Cancelado."
  exit 0
}

Push-Location $GestorAppDir
try {
  docker compose --profile seed run --rm seed
} finally {
  Pop-Location
}
