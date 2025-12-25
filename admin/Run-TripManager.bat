@echo off
:: Quick launcher for Trip Manager
:: Put this file anywhere and double-click to run

:: Find the admin folder (adjust path as needed)
set "ADMIN_FOLDER=%~dp0"

:: If this script is not in admin folder, try common locations
if not exist "%ADMIN_FOLDER%trip-manager.py" (
    if exist "%USERPROFILE%\TravelBooking\admin\trip-manager.py" (
        set "ADMIN_FOLDER=%USERPROFILE%\TravelBooking\admin\"
    ) else if exist "C:\TravelBooking\admin\trip-manager.py" (
        set "ADMIN_FOLDER=C:\TravelBooking\admin\"
    ) else if exist "%USERPROFILE%\Documents\TravelBooking\admin\trip-manager.py" (
        set "ADMIN_FOLDER=%USERPROFILE%\Documents\TravelBooking\admin\"
    )
)

cd /d "%ADMIN_FOLDER%"

if not exist "trip-manager.py" (
    echo Cannot find trip-manager.py
    echo Please run TripManager-Windows.bat first for initial setup.
    pause
    exit /b 1
)

start "" python trip-manager.py
