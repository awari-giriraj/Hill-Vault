@echo off
echo ============================================
echo    Starting HillVault Development Mode
echo ============================================
echo.
echo This will start:
echo  - Vite dev server (React frontend)
echo  - Electron window (Desktop app)
echo.
echo Please wait...
echo.

cd /d "%~dp0"

REM Kill any existing processes on port 5173
echo Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Stopping process on port 5173...
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting application...
echo.
call npm run electron:dev
