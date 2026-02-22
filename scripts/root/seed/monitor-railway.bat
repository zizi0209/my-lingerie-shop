@echo off
echo ========================================
echo Railway Deployment Monitor
echo ========================================
echo.
echo Waiting for deployment to complete...
echo Expected time: 2-5 minutes
echo.
echo Current time: %time%
echo.

:loop
timeout /t 60 /nobreak >nul
cls
echo ========================================
echo Railway Deployment Monitor
echo ========================================
echo.
echo Current time: %time%
echo.
echo Testing deployment status...
echo.

node scripts/root/test/test-railway.js

echo.
echo ----------------------------------------
echo Press Ctrl+C to stop monitoring
echo Will check again in 60 seconds...
echo ----------------------------------------
echo.

goto loop
