# Playwright E2E + videos para /e2e
param([switch]$Install)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")

$GestorAppDir = Get-GestorAppDir -RepoRoot (Get-GestorRepoRoot -StartDir $PSScriptRoot)

Push-Location $GestorAppDir
try {
  if ($Install -or -not (Test-Path "node_modules")) {
    npm ci
  }
  npx playwright install chromium
  npm run test:e2e
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host ""
  Write-Host "Videos copiados a gestor-app/public/e2e-replays/" -ForegroundColor Green
  Write-Host "Galeria: http://localhost:3000/e2e" -ForegroundColor Cyan
} finally {
  Pop-Location
}
