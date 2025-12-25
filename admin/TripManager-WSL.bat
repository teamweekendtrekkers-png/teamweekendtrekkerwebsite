@echo off
:: ============================================================
:: Trip Manager - WSL Launcher for Windows
:: Double-click this file to run Trip Manager in WSL
:: ============================================================

title Trip Manager - WSL Setup

echo.
echo  ========================================================
echo     Trip Manager - WSL Setup
echo  ========================================================
echo.

:: Check if WSL is installed
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  WSL is not installed. Installing WSL...
    echo.
    echo  This will open an admin prompt to install WSL.
    echo  After installation, RESTART your computer and run this again.
    echo.
    powershell -Command "Start-Process wsl -ArgumentList '--install' -Verb RunAs"
    pause
    exit /b 1
)

:: Check if Ubuntu is installed by testing for apt
wsl -e apt --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  ========================================================
    echo   Ubuntu Linux is not installed in WSL!
    echo  ========================================================
    echo.
    echo  Installing Ubuntu... This may take 5-10 minutes.
    echo.
    wsl --install -d Ubuntu
    echo.
    echo  ========================================================
    echo   IMPORTANT: After Ubuntu installs:
    echo   1. A new window will open asking for username/password
    echo   2. Create a username and password
    echo   3. Close that window
    echo   4. RESTART your computer
    echo   5. Run this script again
    echo  ========================================================
    echo.
    pause
    exit /b 1
)

echo  WSL Ubuntu detected!
echo.

:: Now run with bash explicitly
echo  [1/3] Installing Python3 and dependencies...
wsl -e bash -c "sudo apt-get update -qq && sudo apt-get install -y python3 python3-tk git"
echo        Done.
echo.

echo  [2/3] Cloning/updating project...
wsl -e bash -c "if [ ! -d ~/TravelBooking ]; then git clone git@github.com:teamweekendtrekkers-png/teamweekendtrekkerwebsite.git ~/TravelBooking; else cd ~/TravelBooking && git pull; fi"
echo        Done.
echo.

echo  ========================================================
echo     Starting Trip Manager...
echo  ========================================================
echo.

:: Run Trip Manager with bash
wsl -e bash -c "cd ~/TravelBooking/admin && python3 trip-manager.py"

echo.
echo  Trip Manager closed.
pause
