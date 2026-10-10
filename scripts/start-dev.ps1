# Levanta prototipo (mock) y gestor-app (Next.js) en la misma terminal.
param(
  [switch]$BuildMock,
  [switch]$Install
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PrototipoDir = Join-Path $RepoRoot "prototipo"
$GestorAppDir = Join-Path $RepoRoot "gestor-app"
$MockPort = 8765
$MockUrl = "http://127.0.0.1:$MockPort/index.html"
$NextUrl = "http://localhost:3000"
$NextGestionUrl = "http://localhost:3000/gestion"

$script:MockJob = $null

function Test-CommandExists {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Stop-MockServer {
  if ($null -eq $script:MockJob) {
    return
  }
  $job = Get-Job -Id $script:MockJob.Id -ErrorAction SilentlyContinue
  if ($job) {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  }
  $script:MockJob = $null
}

function Start-MockServer {
  param([string]$Dir, [int]$Port)

  $script:MockJob = Start-Job -Name GestorMockHttp -ScriptBlock {
    param($WorkDir, $ListenPort)
    Set-Location -LiteralPath $WorkDir
    if (Get-Command python -ErrorAction SilentlyContinue) {
      python -m http.server $ListenPort
      return
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
      py -3 -m http.server $ListenPort
      return
    }
    throw "Python no disponible en el job del mock."
  } -ArgumentList $Dir, $Port

  Start-Sleep -Seconds 1
  $state = (Get-Job -Id $script:MockJob.Id).State
  if ($state -eq "Failed") {
    Receive-Job -Job $script:MockJob
    Stop-MockServer
    throw "No se pudo iniciar el servidor mock en el puerto $Port."
  }
}

Write-Host "Gestor de flujos - desarrollo local" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Write-Host ""

if (-not (Test-Path $PrototipoDir)) {
  Write-Error "No se encontro la carpeta prototipo en $PrototipoDir"
}
if (-not (Test-Path $GestorAppDir)) {
  Write-Error "No se encontro la carpeta gestor-app en $GestorAppDir"
}

if (-not (Test-CommandExists "python") -and -not (Test-CommandExists "py")) {
  Write-Error "Falta Python. Instala Python 3 o usa el launcher py en PATH."
}
if (-not (Test-CommandExists "node")) {
  Write-Error "Falta Node.js. Instala Node LTS desde https://nodejs.org/"
}
if (-not (Test-CommandExists "npm")) {
  Write-Error "Falta npm (viene con Node.js)."
}

if ($BuildMock) {
  Write-Host "Regenerando bundle del mock..." -ForegroundColor Yellow
  & (Join-Path $PrototipoDir "build-mock.ps1")
  if ($LASTEXITCODE -ne 0) {
    Write-Error "build-mock.ps1 fallo."
  }
}

$nodeModules = Join-Path $GestorAppDir "node_modules"
if ($Install) {
  Write-Host "Instalando dependencias de gestor-app (npm ci)..." -ForegroundColor Yellow
  Push-Location $GestorAppDir
  npm ci
  if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Error "npm ci fallo en gestor-app."
  }
  Pop-Location
} elseif (-not (Test-Path $nodeModules)) {
  Write-Error "No existe gestor-app/node_modules. Ejecuta: .\scripts\start-dev.ps1 -Install"
}

Write-Host "Iniciando mock en segundo plano (puerto $MockPort)..." -ForegroundColor Yellow
Start-MockServer -Dir $PrototipoDir -Port $MockPort
Write-Host "Mock listo: $MockUrl" -ForegroundColor Green

Start-Process $MockUrl
Start-Process $NextUrl
Start-Process $NextGestionUrl

Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Mock (prototipo):     $MockUrl"
Write-Host "  Next (gestor-app):    $NextUrl"
Write-Host "  Gestion (motor API):  $NextGestionUrl"
Write-Host ""
Write-Host "A continuacion corre Next.js en esta terminal. Ctrl+C detiene Next y el mock." -ForegroundColor DarkGray
Write-Host 'Opciones: -BuildMock regenera bundle.js; -Install ejecuta npm ci en gestor-app' -ForegroundColor DarkGray
Write-Host ""

Push-Location $GestorAppDir
try {
  npm run dev
} finally {
  Pop-Location
  Write-Host ""
  Write-Host "Deteniendo servidor mock..." -ForegroundColor DarkGray
  Stop-MockServer
}
