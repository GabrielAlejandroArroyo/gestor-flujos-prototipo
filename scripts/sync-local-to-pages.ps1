# Extrae localStorage del mock desde Chrome y genera prototipo/data/github-pages-bootstrap.json
param(
  [switch]$Publish,
  [string]$Message = "chore(pages): sync mock data from local Chrome"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ChromeLs = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data\Default\Local Storage\leveldb"
$Tmp = Join-Path $RepoRoot ".tmp-chrome-ls"

if (-not (Test-Path $ChromeLs)) {
  Write-Error "No se encontró Chrome Local Storage en: $ChromeLs"
}

if (Test-Path $Tmp) { Remove-Item $Tmp -Recurse -Force }
New-Item -ItemType Directory -Path $Tmp | Out-Null
Copy-Item (Join-Path $ChromeLs "*.ldb") $Tmp
Copy-Item (Join-Path $ChromeLs "CURRENT") $Tmp -ErrorAction SilentlyContinue
Copy-Item (Join-Path $ChromeLs "MANIFEST-*") $Tmp -ErrorAction SilentlyContinue

Push-Location $RepoRoot
try {
  node scripts/extract-chrome-localstorage.mjs ".tmp-chrome-ls" "prototipo/data/github-pages-bootstrap.json"
  & (Join-Path $RepoRoot "prototipo\build-mock.ps1")
  if ($Publish) {
    & (Join-Path $PSScriptRoot "mock-publish-github.ps1") -Message $Message
  } else {
    Write-Host "Listo. Commit y push prototipo/ (o ejecutá con -Publish)." -ForegroundColor Green
  }
} finally {
  Pop-Location
}
