@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install a supported Node.js LTS release first.
  pause
  exit /b 1
)
node scripts/start.js
pause
