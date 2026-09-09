@echo off
REM Explorer App - Windows Build Launcher (Project Root)
cd /d "%~dp0"
if exist "scripts\build-windows.bat" (
    call "scripts\build-windows.bat"
) else (
    echo [ERROR] scripts\build-windows.bat not found.
    pause
)
