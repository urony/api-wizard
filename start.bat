@echo off
cd /d "%~dp0"
echo Starting the site at http://localhost:8080/ (close this window to stop)
start "" http://localhost:8080/
node scripts\serve.mjs
pause
