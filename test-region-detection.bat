 @echo off
 echo Starting Region Detection Test...
 echo.
 
 :: Check if backend is running
 curl -s http://localhost:5000/health >nul 2>&1
 if %errorlevel% neq 0 (
     echo Backend is not running!
     echo Please start backend first: cd backend ^&^& npm run dev
     pause
     exit /b 1
 )
 
 echo Backend is running. Starting tests...
 echo.
 
 node test-region-detection.js
 
 echo.
 pause
