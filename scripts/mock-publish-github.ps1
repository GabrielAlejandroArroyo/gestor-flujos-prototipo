# Build del mock + commit en prototipo/ + confirmacion + push a main (GitHub Pages)
param(
  [Parameter(Mandatory = $true)]
  [string]$Message,
  [switch]$SkipBuild,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$ExpectedRemoteFragment = "GabrielAlejandroArroyo/gestor-flujos-prototipo"
$PagesUrl = "https://gabrielalejandroarroyo.github.io/gestor-flujos-prototipo/"
$ActionsUrl = "https://github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo/actions"

function Test-CommandExists {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Git {
  param([string[]]$GitArgs)
  $out = & git @GitArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') fallo (exit $LASTEXITCODE): $out"
  }
  return $out
}

if (-not (Test-CommandExists "git")) {
  Write-Error "Falta git en PATH."
}

$RepoRoot = (Invoke-Git @("rev-parse", "--show-toplevel") | Out-String).Trim()
$PrototipoDir = Join-Path $RepoRoot "prototipo"
$BuildScript = Join-Path $PrototipoDir "build-mock.ps1"

Push-Location $RepoRoot
try {
  Write-Host "Publicar mock en GitHub Pages" -ForegroundColor Cyan
  Write-Host "Repo: $RepoRoot"
  Write-Host ""

  $originUrl = (Invoke-Git @("remote", "get-url", "origin") | Out-String).Trim()
  if ($originUrl -notmatch [regex]::Escape($ExpectedRemoteFragment)) {
    Write-Error @"
El remote 'origin' no apunta al repo personal esperado ($ExpectedRemoteFragment).
URL actual: $originUrl
Regla platino: no publicar desde un remote de Accusys/otro org. Ver PLATINO.md y DESPLIEGUE.md.
"@
  }

  $branch = (Invoke-Git @("branch", "--show-current") | Out-String).Trim()
  if ($branch -ne "main") {
    Write-Error "Debes estar en la rama 'main' (actual: '$branch')."
  }

  if (-not $SkipBuild) {
    if (-not (Test-Path $BuildScript)) {
      Write-Error "No se encontro $BuildScript"
    }
    Write-Host "Regenerando bundle (build-mock.ps1)..." -ForegroundColor Yellow
    if ($DryRun) {
      Write-Host "[DryRun] Ejecutaria: $BuildScript" -ForegroundColor DarkGray
    } else {
      & $BuildScript
      if ($LASTEXITCODE -ne 0) {
        Write-Error "build-mock.ps1 fallo."
      }
    }
  } else {
    Write-Host "Omitiendo build (-SkipBuild)." -ForegroundColor DarkGray
  }

  $statusBefore = git status --porcelain
  if (-not $statusBefore) {
    Write-Host "No hay cambios para commitear (incluido prototipo/ tras el build)." -ForegroundColor Yellow
    exit 0
  }

  Write-Host ""
  Write-Host "Cambios detectados:" -ForegroundColor Cyan
  git status -sb
  Write-Host ""
  git diff --stat -- prototipo/

  if ($DryRun) {
    Write-Host ""
    Write-Host "[DryRun] Ejecutaria: git add prototipo/" -ForegroundColor DarkGray
    Write-Host "[DryRun] Ejecutaria: git commit -m `"$Message`"" -ForegroundColor DarkGray
    Write-Host "[DryRun] Pedir confirmacion y luego: git push origin main" -ForegroundColor DarkGray
    exit 0
  }

  Invoke-Git @("add", "--", "prototipo/") | Out-Null
  $staged = git diff --cached --name-only
  if (-not $staged) {
    Write-Host "Nada staged en prototipo/. Revisa git status." -ForegroundColor Yellow
    exit 1
  }

  Write-Host ""
  Write-Host "Archivos en el commit:" -ForegroundColor Cyan
  $staged | ForEach-Object { Write-Host "  $_" }

  try {
    Invoke-Git @("commit", "-m", $Message) | Out-Null
  } catch {
    Write-Host ""
    Write-Host "El commit fallo (p. ej. hook pre-commit). Corregi y volve a ejecutar el script." -ForegroundColor Red
    throw
  }

  $lastCommit = (Invoke-Git @("log", "-1", "--oneline") | Out-String).Trim()
  Write-Host ""
  Write-Host "Ultimo commit: $lastCommit" -ForegroundColor Green
  Write-Host "Sitio publico (tras deploy): $PagesUrl" -ForegroundColor Cyan
  Write-Host "Remote origin: $originUrl"
  Write-Host ""

  $answer = Read-Host "Push a origin main? (s/N)"
  if ($answer -notmatch '^[sS]$') {
    Write-Host "Push cancelado. El commit quedo en local; podes hacer push manual cuando quieras." -ForegroundColor Yellow
    exit 0
  }

  Invoke-Git @("push", "origin", "main") | Out-Null
  Write-Host ""
  Write-Host "Push completado. GitHub Actions desplegara prototipo/ en Pages (~20 s)." -ForegroundColor Green

  if (Test-CommandExists "gh") {
    Write-Host ""
    Write-Host "Ultimo workflow Deploy GitHub Pages:" -ForegroundColor Cyan
    gh run list -R "$ExpectedRemoteFragment" --workflow=deploy-pages.yml --limit 1
  } else {
    Write-Host "Segui el deploy en: $ActionsUrl" -ForegroundColor Cyan
  }

  Write-Host ""
  Write-Host "Cuando el run este en success, recarga $PagesUrl (Ctrl+F5)." -ForegroundColor DarkGray
} finally {
  Pop-Location
}
