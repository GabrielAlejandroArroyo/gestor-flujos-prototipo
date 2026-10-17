# Guardias de despliegue — repo personal, sin Accusys/AccuOne (PLATINO.md)

$script:PlatinoExpectedRemoteFragment = "GabrielAlejandroArroyo/gestor-flujos-prototipo"

# Refs Supabase de la org AccuOne (prohibidos para este proyecto personal)
$script:PlatinoBlockedSupabaseRefs = @(
  "szmivzzolwsosnugagti",
  "dqparpoaxbyqpkglvias",
  "vowhozofvexkzkydpbvl"
)

$script:PlatinoBlockedRemotePatterns = @(
  "accusys",
  "accuone",
  "accu-one"
)

function Test-CommandExists {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-PlatinoGit {
  param([string[]]$GitArgs)
  $out = & git @GitArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') falló (exit $LASTEXITCODE): $out"
  }
  return $out
}

function Assert-PersonalGitRemote {
  param(
    [string]$RepoRoot = (Get-Location).Path,
    [switch]$AllowMissingOrigin
  )

  if (-not (Test-CommandExists "git")) {
    throw "Falta git en PATH."
  }

  Push-Location $RepoRoot
  try {
    $root = (Invoke-PlatinoGit @("rev-parse", "--show-toplevel") | Out-String).Trim()
    Push-Location $root
    try {
      $originUrl = ""
      try {
        $originUrl = (Invoke-PlatinoGit @("remote", "get-url", "origin") | Out-String).Trim()
      } catch {
        if ($AllowMissingOrigin) { return }
        throw "No hay remote 'origin'. Solo despliegue personal documentado en PLATINO.md."
      }

      foreach ($pat in $script:PlatinoBlockedRemotePatterns) {
        if ($originUrl -match $pat) {
          throw @"
Remote 'origin' bloqueado por regla platino (Accusys/AccuOne).
URL: $originUrl
Ver PLATINO.md — usá github.com/GabrielAlejandroArroyo/gestor-flujos-prototipo
"@
        }
      }

      if ($originUrl -notmatch [regex]::Escape($script:PlatinoExpectedRemoteFragment)) {
        throw @"
El remote 'origin' no apunta al repo personal esperado ($($script:PlatinoExpectedRemoteFragment)).
URL actual: $originUrl
No desplegar desde org Accusys. Ver PLATINO.md y DESPLIEGUE.md.
"@
      }
    } finally {
      Pop-Location
    }
  } finally {
    Pop-Location
  }
}

function Assert-NotAccuOneSupabaseRef {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) { return }

  $lower = $Text.ToLowerInvariant()
  foreach ($ref in $script:PlatinoBlockedSupabaseRefs) {
    if ($lower.Contains($ref)) {
      throw @"
Referencia Supabase de AccuOne detectada ($ref).
Este proyecto usa Supabase personal. Ver gestor-app/DEPLOY.md y PLATINO.md.
"@
    }
  }

  foreach ($pat in $script:PlatinoBlockedRemotePatterns) {
    if ($lower.Contains($pat)) {
      throw "URL/cadena Supabase contiene '$pat' (bloqueado por regla platino)."
    }
  }
}

function Read-GestorEnvFile {
  param([string]$GestorAppDir)

  $candidates = @(
    (Join-Path $GestorAppDir ".env"),
    (Join-Path $GestorAppDir ".env.local")
  )
  foreach ($path in $candidates) {
    if (-not (Test-Path $path)) { continue }
    $content = Get-Content -LiteralPath $path -Raw -ErrorAction SilentlyContinue
    if ($content) { return $content }
  }
  return $null
}

function Assert-GestorEnvNotAccuOne {
  param([string]$GestorAppDir)

  $raw = Read-GestorEnvFile -GestorAppDir $GestorAppDir
  if (-not $raw) { return }
  Assert-NotAccuOneSupabaseRef -Text $raw
}

function Confirm-DeployAction {
  param(
    [string]$Prompt,
    [switch]$Force
  )
  if ($Force) { return $true }
  $answer = Read-Host $Prompt
  return $answer -eq "s" -or $answer -eq "S" -or $answer -eq "y" -or $answer -eq "Y"
}
