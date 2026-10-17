$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")

$GestorAppDir = Get-GestorAppDir -RepoRoot (Get-GestorRepoRoot -StartDir $PSScriptRoot)
Push-Location $GestorAppDir
try {
  docker compose down
} finally {
  Pop-Location
}
