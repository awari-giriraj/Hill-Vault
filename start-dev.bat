@echo off
echo Starting VaultMind...
echo.
cd /d "%~dp0"
call npm run electron:dev
