@echo off
:: ============================================================
:: Trip Manager - WSL Launcher for Windows
:: Double-click this file to run Trip Manager in WSL
:: ============================================================

title Trip Manager - WSL

echo.
echo  Starting Trip Manager in WSL...
echo.

:: Run the bash script in WSL
wsl -e bash -c "cd /home/simplifybytes/TravelBooking/admin && ./run-trip-manager.sh"

pause
