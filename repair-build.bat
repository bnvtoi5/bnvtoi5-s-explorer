@echo off
cd /d "%~dp0"
if exist "scripts\repair-and-clean.bat" (
    call "scripts\repair-and-clean.bat"
) else (
    echo [ERROR] scripts\repair-and-clean.bat not found.
    pause
)
