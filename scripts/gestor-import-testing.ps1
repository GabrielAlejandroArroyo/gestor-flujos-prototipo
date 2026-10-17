# Import testing-bootstrap → Supabase (CLI Node, sin Docker)
param([switch]$Force)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")
. (Join-Path $PSScriptRoot "lib/platino-guard.ps1")

$GestorAppDir = Get-GestorAppDir -RepoRoot (Get-GestorRepoRoot -StartDir $PSScriptRoot)
Assert-GestorEnvNotAccuOne -GestorAppDir $GestorAppDir

$envFile = Join-Path $GestorAppDir ".env"
if (-not (Test-Path $envFile)) {
  Write-Error "Falta $envFile — completá Supabase personal y reintentá."
}

if (-not (Confirm-DeployAction -Prompt "¿Importar testing-bootstrap al Supabase configurado en .env? (s/N)" -Force:$Force)) {
  exit 0
}

Push-Location $GestorAppDir
try {
  if (-not (Test-Path "node_modules")) {
    npm ci
  }
  # Carga variables para el script Node
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $pair = $_ -split '=', 2
    if ($pair.Count -eq 2) {
      Set-Item -Path "env:$($pair[0].Trim())" -Value $pair[1].Trim()
    }
  }
  npm run import:testing
} finally {
  Pop-Location
}
