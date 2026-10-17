# Inicializa .env desde plantilla (gestor-app)
param([switch]$Force)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")

$GestorAppDir = Get-GestorAppDir
$Example = Join-Path $GestorAppDir ".env.example"
$EnvFile = Join-Path $GestorAppDir ".env"

if (-not (Test-Path $Example)) {
  Write-Error "Falta $Example"
}

if ((Test-Path $EnvFile) -and -not $Force) {
  Write-Host "Ya existe $EnvFile (usá -Force para sobrescribir)." -ForegroundColor Yellow
  exit 0
}

Copy-Item -LiteralPath $Example -Destination $EnvFile -Force
Write-Host "Creado: $EnvFile" -ForegroundColor Green
Write-Host "Completá NEXT_PUBLIC_SUPABASE_* y SUPABASE_SERVICE_ROLE_KEY (proyecto personal)."
Write-Host "Luego: .\scripts\gestor.ps1 docker-up   o   .\scripts\gestor.ps1 dev"
