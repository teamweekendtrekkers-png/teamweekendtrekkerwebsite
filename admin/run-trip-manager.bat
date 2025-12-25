@echo off
title Trip Manager - Team Weekend Trekkers
cd /d "%~dp0"
python trip-manager.py
if errorlevel 1 (
    echo.
    echo Error running Trip Manager.
    echo Make sure Python is installed and added to PATH.
    echo.
    pause
)
