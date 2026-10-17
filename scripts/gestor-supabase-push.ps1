# Aplica migraciones gestor-app/supabase/migrations al proyecto linkado (personal)
param([switch]$Force)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib/gestor-app-paths.ps1")
. (Join-Path $PSScriptRoot "lib/platino-guard.ps1")

$RepoRoot = Get-GestorRepoRoot -StartDir $PSScriptRoot
Assert-PersonalGitRemote -RepoRoot $RepoRoot

$GestorAppDir = Get-GestorAppDir -RepoRoot $RepoRoot
Assert-GestorEnvNotAccuOne -GestorAppDir $GestorAppDir

$configToml = Join-Path $GestorAppDir "supabase/config.toml"
if (Test-Path $configToml) {
  $toml = Get-Content $configToml -Raw
  Assert-NotAccuOneSupabaseRef -Text $toml
}

if (-not (Confirm-DeployAction -Prompt "¿Ejecutar 'npx supabase db push' en gestor-app (proyecto linkado personal)? (s/N)" -Force:$Force)) {
  exit 0
}

Push-Location $GestorAppDir
try {
  Write-Host "Recordá: npx supabase link --project-ref <TU_REF_PERSONAL> si aún no linkaste." -ForegroundColor Yellow
  npx supabase db push
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Opcional: npx supabase gen types typescript --linked > src/lib/supabase/types.ts" -ForegroundColor DarkGray
} finally {
  Pop-Location
}
