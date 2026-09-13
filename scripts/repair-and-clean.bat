@echo off
setlocal enabledelayedexpansion
title Clean Cargo Cache and Rebuild

cd /d "%~dp0.."

echo =======================================================
echo   Sua loi rlib/rmeta stub va don dep bo nho dem Cargo
echo   Thu muc hien tai: %CD%
echo =======================================================
echo.

echo [1/3] Don dep thu muc build src-tauri/target...
if exist "src-tauri\target" (
    rmdir /s /q "src-tauri\target" 2>nul
    echo Da xoa thu muc target thanh cong.
) else (
    echo Thu muc target khong ton tai hoac da duoc don dep.
)

echo.
echo [2/3] Xoa bo nho dem Cargo Registry bi loi (metadata stub)...
if exist "%USERPROFILE%\.cargo\registry\cache" (
    rmdir /s /q "%USERPROFILE%\.cargo\registry\cache" 2>nul
    echo Da xoa cache registry.
)
if exist "%USERPROFILE%\.cargo\registry\src" (
    rmdir /s /q "%USERPROFILE%\.cargo\registry\src" 2>nul
    echo Da xoa source registry cu.
)

echo.
echo [3/3] Kiem tra toolchain Rust...
where rustup >nul 2>nul
if %errorlevel% equ 0 (
    echo Dang cap nhat component rust-std cho toolchain...
    call rustup component add rust-std
)

echo.
echo =======================================================
echo Don dep hoan tat! Ban co the chay build-windows.bat lai.
echo =======================================================
echo.
set /p CHOICE="Ban co muon chay build-windows.bat ngay bay gio khong? (Y/N): "
if /i "!CHOICE!"=="Y" (
    call "%~dp0build-windows.bat"
) else (
    echo Tam dung. Bam phim bat ky de thoat...
    pause >nul
)
