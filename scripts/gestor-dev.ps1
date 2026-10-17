# Next.js en modo desarrollo (solo gestor-app, sin mock)
param([switch]$Install)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")
. (Join-Path $PSScriptRoot "lib/platino-guard.ps1")

$RepoRoot = Get-GestorRepoRoot -StartDir $PSScriptRoot
$GestorAppDir = Get-GestorAppDir -RepoRoot $RepoRoot

Assert-GestorEnvNotAccuOne -GestorAppDir $GestorAppDir

Push-Location $GestorAppDir
try {
  if ($Install -or -not (Test-Path "node_modules")) {
    Write-Host "npm ci..." -ForegroundColor Yellow
    npm ci
  }

  $envLocal = Join-Path $GestorAppDir ".env.local"
  $envProd = Join-Path $GestorAppDir ".env"
  if (-not (Test-Path $envLocal) -and (Test-Path $envProd)) {
    Write-Host "Tip: Next lee .env.local; podés copiar desde .env si hace falta." -ForegroundColor DarkGray
  }

  Write-Host ""
  Write-Host "Gestor App (dev) — http://localhost:3000" -ForegroundColor Cyan
  Write-Host "Integración — http://localhost:3000/integracion" -ForegroundColor Cyan
  Write-Host ""

  npm run dev
} finally {
  Pop-Location
}
