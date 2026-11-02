@echo off
echo Starting ELVA TECH HRMS...

start "ELVA HRMS Backend" cmd /k "cd /d "%~dp0apps\backend\hr-module" && npm run dev"

timeout /t 3 /nobreak >nul

start "ELVA HRMS Frontend" cmd /k "cd /d "%~dp0apps\frontend\hr-module" && npm run dev"

echo.
echo Both startup commands have been launched.
echo Wait for both servers to display their Local URLs.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
