@echo off
echo =======================================================
echo   Explorer App - Windows Installer and Portable Builder
echo =======================================================
echo.

REM 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required for building. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM 2. Check Rust
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Rust and Cargo are required for Tauri build.
    echo Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

echo [1/4] Installing dependencies...
call npm install
call npm install --no-save @rollup/rollup-win32-x64-msvc@4.63.1

echo [2/4] Generating Windows application icons...
call node scripts/generate-icons.mjs

echo [3/4] Building Vite frontend distribution...
call npm run build

echo [4/4] Compiling Windows NSIS Installer and Portable Executable via Tauri...
call npm run tauri build

if not exist release mkdir release

REM Copy standard installer
for /r "src-tauri\target\release\bundle\nsis" %%f in (*setup.exe) do (
    copy /y "%%f" "release\ExplorerApp-Setup.exe" >nul
    echo.
    echo [SUCCESS] Windows Installer created at: release\ExplorerApp-Setup.exe
)

REM Copy portable executable
if exist "src-tauri\target\release\explorer-app.exe" (
    copy /y "src-tauri\target\release\explorer-app.exe" "release\ExplorerApp-Portable.exe" >nul
    echo [SUCCESS] Windows Portable App created at: release\ExplorerApp-Portable.exe
)

echo.
echo =======================================================
echo Build complete! Deliverables ready in .\release\ folder:
echo 1. release\ExplorerApp-Setup.exe   (Installer for Windows 11)
echo 2. release\ExplorerApp-Portable.exe (Standalone portable app)
echo =======================================================
pause
