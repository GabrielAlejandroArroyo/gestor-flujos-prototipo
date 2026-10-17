# Punto de entrada — Gestor App (Docker, dev, Supabase, Vercel personal)
# Uso: .\scripts\gestor.ps1 help
# Regla platino: no Accusys/AccuOne — ver PLATINO.md

param(
  [ValidateSet(
    "help",
    "env-init",
    "dev",
    "prod",
    "docker-up",
    "docker-down",
    "docker-logs",
    "docker-seed",
    "import",
    "supabase-push",
    "vercel"
  )]
  [string]$Action = "help",
  [switch]$Force,
  [switch]$Install,
  [switch]$Production
)

$ErrorActionPreference = "Stop"
$ScriptsDir = $PSScriptRoot

$map = @{
  "env-init"       = "gestor-env-init.ps1"
  "dev"            = "gestor-dev.ps1"
  "prod"           = "gestor-prod-local.ps1"
  "docker-up"      = "gestor-docker-up.ps1"
  "docker-down"    = "gestor-docker-down.ps1"
  "docker-logs"    = "gestor-docker-logs.ps1"
  "docker-seed"    = "gestor-docker-seed.ps1"
  "import"         = "gestor-import-testing.ps1"
  "supabase-push"  = "gestor-supabase-push.ps1"
  "vercel"         = "gestor-vercel.ps1"
}

if ($Action -eq "help") {
  & (Join-Path $ScriptsDir "gestor-help.ps1")
  exit 0
}

$target = Join-Path $ScriptsDir $map[$Action]
if (-not (Test-Path $target)) {
  Write-Error "Script no encontrado: $target"
}

$params = @{}
if ($Force) { $params["Force"] = $true }
if ($Install) { $params["Install"] = $true }
if ($Production) { $params["Production"] = $true }

& $target @params
exit $LASTEXITCODE
