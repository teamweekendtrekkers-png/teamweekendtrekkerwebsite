@echo off
:: ============================================================
:: Trip Manager - WSL Launcher for Windows
:: Double-click this file to run Trip Manager in WSL
:: ============================================================

title Trip Manager - WSL

echo.
echo  ========================================================
echo     Trip Manager - Starting in WSL...
echo  ========================================================
echo.

:: Try default WSL (no distro name needed)
wsl python3 /home/simplifybytes/TravelBooking/admin/trip-manager.py

echo.
echo  Trip Manager closed.
pause
