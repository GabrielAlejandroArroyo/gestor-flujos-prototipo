# Ayuda - scripts Gestor App (sin AccuOne)
Write-Host ''
Write-Host 'Gestor App - scripts (repo personal, PLATINO.md)' -ForegroundColor Cyan
Write-Host ''
Write-Host '  .\scripts\gestor.ps1 env-init          Copia .env.example -> .env'
Write-Host '  .\scripts\gestor.ps1 dev               Next.js desarrollo (:3000)'
Write-Host '  .\scripts\gestor.ps1 prod              build + start local'
Write-Host '  .\scripts\gestor.ps1 docker-up         Docker Compose up --build'
Write-Host '  .\scripts\gestor.ps1 docker-down       Docker Compose down'
Write-Host '  .\scripts\gestor.ps1 docker-logs       Logs del contenedor'
Write-Host '  .\scripts\gestor.ps1 docker-seed       Import testing (profile seed)'
Write-Host '  .\scripts\gestor.ps1 import            Import CLI -> Supabase'
Write-Host '  .\scripts\gestor.ps1 supabase-push     npx supabase db push (gestor-app)'
Write-Host '  .\scripts\gestor.ps1 vercel            Deploy Vercel (cuenta personal)'
Write-Host '  .\scripts\gestor.ps1 e2e               Playwright + videos en /e2e'
Write-Host ''
Write-Host 'URLs locales:' -ForegroundColor Yellow
Write-Host '  App          http://localhost:3000'
Write-Host '  Integracion  http://localhost:3000/integracion'
Write-Host '  Health       http://localhost:3000/api/health'
Write-Host ''
Write-Host 'Docs: gestor-app/DEPLOY.md' -ForegroundColor DarkGray
Write-Host ''
