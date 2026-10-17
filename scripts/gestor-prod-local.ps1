# Build + start producción local (Node, sin Docker)
param([switch]$Install)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")
. (Join-Path $PSScriptRoot "lib/platino-guard.ps1")

$GestorAppDir = Get-GestorAppDir -RepoRoot (Get-GestorRepoRoot -StartDir $PSScriptRoot)
Assert-GestorEnvNotAccuOne -GestorAppDir $GestorAppDir

Push-Location $GestorAppDir
try {
  if ($Install -or -not (Test-Path "node_modules")) {
    npm ci
  }
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Producción local — http://localhost:3000" -ForegroundColor Cyan
  npm run start
} finally {
  Pop-Location
}
