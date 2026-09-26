$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$port = 8765
Write-Host "Mock en http://127.0.0.1:$port/index.html (Ctrl+C para detener)"
Start-Process "http://127.0.0.1:$port/index.html"
python -m http.server $port
