@echo off
:: ============================================================
:: Trip Manager - WSL Launcher for Windows
:: Double-click this file to run Trip Manager in WSL
:: ============================================================

title Trip Manager - WSL

echo.
echo  ========================================================
echo     Trip Manager - Setting up WSL environment...
echo  ========================================================
echo.

:: Check if WSL is available
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  ERROR: WSL is not installed or not running.
    echo  Please install WSL first: wsl --install
    pause
    exit /b 1
)

echo  [1/3] Checking Python3...
wsl which python3 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo        Installing Python3...
    wsl sudo apt-get update -qq
    wsl sudo apt-get install -y python3 python3-tk
)
echo        Done.

echo  [2/3] Checking Tkinter...
wsl python3 -c "import tkinter" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo        Installing python3-tk...
    wsl sudo apt-get install -y python3-tk
)
echo        Done.

echo  [3/3] Checking Git...
wsl which git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo        Installing Git...
    wsl sudo apt-get install -y git
)
echo        Done.

echo.
echo  ========================================================
echo     Starting Trip Manager...
echo  ========================================================
echo.

:: Run Trip Manager
wsl python3 /home/simplifybytes/TravelBooking/admin/trip-manager.py

echo.
echo  Trip Manager closed.
pause
