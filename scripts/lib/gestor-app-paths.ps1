# Rutas comunes gestor-app (dot-source desde scripts/gestor-*.ps1)

function Get-GestorRepoRoot {
  param([string]$StartDir)

  if (-not $StartDir) {
    $StartDir = $PSScriptRoot
  }
  $scriptsDir = Split-Path -Parent $StartDir
  if ((Split-Path -Leaf $scriptsDir) -eq "lib") {
    $scriptsDir = Split-Path -Parent $scriptsDir
  }
  return (Resolve-Path (Join-Path $scriptsDir "..")).Path
}

function Get-GestorAppDir {
  param([string]$RepoRoot)
  if (-not $RepoRoot) {
    $RepoRoot = Get-GestorRepoRoot -StartDir $PSScriptRoot
  }
  return (Join-Path $RepoRoot "gestor-app")
}
