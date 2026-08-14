# Startskript for Atlantasy Desktop (Convex Backend + Tauri v2 Desktop Frontend)

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ⚽ ATLANTASY DESKTOP (Convex + Tauri v2) Starter opp... " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Sjekk om node_modules eksisterer, hvis ikke kjør npm install
if (-not (Test-Path -Path "node_modules")) {
    Write-Host "📦 Installerer npm-pakker først..." -ForegroundColor Yellow
    npm install
}

# Kjør Convex og Tauri v2 parallelt
npx --yes concurrently -n "CONVEX,TAURI" -c "magenta.bold,cyan.bold" "npx convex dev" "npm run tauri dev"
