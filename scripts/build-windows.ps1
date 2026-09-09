# Windows PowerShell Build Script for Explorer App
$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   Explorer App - Windows Installer & Portable Build" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Check Prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Error "Rust toolchain is not installed. Please install Rust from https://rustup.rs"
    exit 1
}

Write-Host "[1/4] Installing npm dependencies..." -ForegroundColor Yellow
npm install

Write-Host "[2/4] Generating high-resolution Windows icons..." -ForegroundColor Yellow
node scripts/generate-icons.mjs

Write-Host "[3/4] Building production frontend..." -ForegroundColor Yellow
npm run build

Write-Host "[4/4] Building Tauri Windows packages (NSIS installer & portable exe)..." -ForegroundColor Yellow
npm run tauri build

# Prepare release folder
if (-not (Test-Path "release")) {
    New-Item -ItemType Directory -Path "release" | Out-Null
}

$setupFile = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis\*setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($setupFile) {
    Copy-Item -Path $setupFile.FullName -Destination "release\ExplorerApp-Setup.exe" -Force
    Write-Host "  -> [SUCCESS] Installer: release\ExplorerApp-Setup.exe" -ForegroundColor Green
}

$portableFile = "src-tauri\target\release\explorer-app.exe"
if (Test-Path $portableFile) {
    Copy-Item -Path $portableFile -Destination "release\ExplorerApp-Portable.exe" -Force
    Write-Host "  -> [SUCCESS] Portable : release\ExplorerApp-Portable.exe" -ForegroundColor Green
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "BUILD COMPLETE!" -ForegroundColor Green
Write-Host "Your Windows 11 deliverables are ready in .\release\ :" -ForegroundColor White
Write-Host "1. release\ExplorerApp-Setup.exe   (NSIS installer for standard users)" -ForegroundColor White
Write-Host "2. release\ExplorerApp-Portable.exe (Double-click portable version)" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Cyan
