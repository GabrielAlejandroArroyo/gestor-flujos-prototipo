# Deploy a Vercel — cuenta personal, root gestor-app (NO AccuOne)
param(
  [switch]$Force,
  [switch]$Production
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")
. (Join-Path $PSScriptRoot "lib/platino-guard.ps1")

$RepoRoot = Get-GestorRepoRoot -StartDir $PSScriptRoot
Assert-PersonalGitRemote -RepoRoot $RepoRoot

$GestorAppDir = Get-GestorAppDir -RepoRoot $RepoRoot
Assert-GestorEnvNotAccuOne -GestorAppDir $GestorAppDir

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "Falta Node.js / npx."
}

$target = if ($Production) { "producción (--prod)" } else { "preview" }
if (-not (Confirm-DeployAction -Prompt "¿Deploy Vercel ($target) desde gestor-app? Cuenta personal, no AccuOne. (s/N)" -Force:$Force)) {
  exit 0
}

Push-Location $GestorAppDir
try {
  if (-not (Test-Path "node_modules")) {
    npm ci
  }

  Write-Host "Si es la primera vez: npx vercel link (team personal)" -ForegroundColor Yellow
  Write-Host "Variables en Vercel: las de .env.example" -ForegroundColor Yellow

  if ($Production) {
    npx vercel deploy --prod
  } else {
    npx vercel deploy
  }
} finally {
  Pop-Location
}
