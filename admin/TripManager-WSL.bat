@echo off
:: ============================================================
:: Trip Manager - WSL Launcher for Windows
:: Double-click this file to run Trip Manager in WSL
:: ============================================================

title Trip Manager - WSL

echo.
echo  ========================================================
echo     Trip Manager - Starting in WSL Ubuntu...
echo  ========================================================
echo.

:: Run Trip Manager directly using Ubuntu WSL
wsl -d Ubuntu -- python3 /home/simplifybytes/TravelBooking/admin/trip-manager.py

echo.
echo  Trip Manager closed.
pause
