# Regenera bundle.js y theme-bundle.js (mock file:// sin ES modules en HTML).
# Ejecutar tras cambios en prototipo/js/ (p. ej. diseñador, paneles canvas-first).
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

npx --yes esbuild js/entry-main.js --bundle --format=iife --outfile=js/bundle.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx --yes esbuild js/entry-theme.js --bundle --format=iife --outfile=js/theme-bundle.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "OK: js/bundle.js y js/theme-bundle.js"
