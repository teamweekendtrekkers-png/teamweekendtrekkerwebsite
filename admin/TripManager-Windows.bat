@echo off
setlocal EnableDelayedExpansion
title Team Weekend Trekkers - Trip Manager Setup
color 0A

echo.
echo  ========================================================
echo     🏔️  Team Weekend Trekkers - Trip Manager
echo  ========================================================
echo.
echo  This script will set up and run the Trip Manager tool.
echo.

:: ============================================================
:: STEP 1: Check if Python is installed
:: ============================================================
echo  [1/5] Checking Python installation...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ❌ Python is NOT installed!
    echo.
    echo  Please install Python first:
    echo  1. Go to: https://www.python.org/downloads/
    echo  2. Download Python 3.10 or later
    echo  3. IMPORTANT: Check "Add Python to PATH" during installation
    echo  4. Run this script again after installing
    echo.
    pause
    exit /b 1
)

:: Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo       ✅ Python %PYVER% found
echo.

:: ============================================================
:: STEP 2: Check if Git is installed
:: ============================================================
echo  [2/5] Checking Git installation...
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ❌ Git is NOT installed!
    echo.
    echo  Please install Git first:
    echo  1. Go to: https://git-scm.com/download/win
    echo  2. Download and install Git for Windows
    echo  3. Use default settings during installation
    echo  4. Run this script again after installing
    echo.
    pause
    exit /b 1
)

for /f "tokens=3" %%i in ('git --version') do set GITVER=%%i
echo       ✅ Git %GITVER% found
echo.

:: ============================================================
:: STEP 3: Check/Setup SSH Key for GitHub
:: ============================================================
echo  [3/5] Checking SSH key for GitHub...

set "SSHDIR=%USERPROFILE%\.ssh"
set "SSHKEY=%SSHDIR%\id_ed25519"
set "SSHPUB=%SSHDIR%\id_ed25519.pub"

if not exist "%SSHDIR%" (
    echo       Creating SSH directory...
    mkdir "%SSHDIR%"
)

if not exist "%SSHKEY%" (
    echo.
    echo  ⚠️  No SSH key found. Creating one...
    echo.
    set /p "EMAIL=  Enter your GitHub email: "
    ssh-keygen -t ed25519 -C "!EMAIL!" -f "%SSHKEY%" -N ""
    echo.
    echo  ✅ SSH key created!
)

:: Check if SSH key is added to ssh-agent
echo       Starting SSH agent...
start /b ssh-agent >nul 2>&1
ssh-add "%SSHKEY%" >nul 2>&1

echo       ✅ SSH key ready
echo.

:: Show the public key
echo  --------------------------------------------------------
echo   📋 YOUR SSH PUBLIC KEY (add this to GitHub):
echo  --------------------------------------------------------
echo.
type "%SSHPUB%"
echo.
echo  --------------------------------------------------------
echo.
echo  If you haven't added this key to GitHub yet:
echo  1. Copy the key above
echo  2. Go to: https://github.com/settings/ssh/new
echo  3. Title: "Trip Manager - %COMPUTERNAME%"
echo  4. Paste the key and click "Add SSH key"
echo.
echo  Press any key after adding the SSH key to GitHub...
pause >nul
echo.

:: Test GitHub SSH connection
echo  [4/5] Testing GitHub connection...
ssh -T git@github.com -o StrictHostKeyChecking=no -o BatchMode=yes >nul 2>&1
if %ERRORLEVEL% EQU 1 (
    echo       ✅ GitHub SSH connection successful!
) else (
    echo       ⚠️  Could not verify GitHub connection.
    echo       The tool may still work if key was added correctly.
)
echo.

:: ============================================================
:: STEP 4: Configure Git (if needed)
:: ============================================================
echo  [5/5] Checking Git configuration...

:: Check if git user is configured
git config --global user.name >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  Git user not configured. Setting up...
    set /p "GITNAME=  Enter your name: "
    set /p "GITEMAIL=  Enter your email: "
    git config --global user.name "!GITNAME!"
    git config --global user.email "!GITEMAIL!"
    echo       ✅ Git configured!
) else (
    for /f "delims=" %%i in ('git config --global user.name') do set GITNAME=%%i
    echo       ✅ Git configured as: !GITNAME!
)
echo.

:: ============================================================
:: STEP 5: Navigate to project and run
:: ============================================================
echo  ========================================================
echo     🚀 Starting Trip Manager...
echo  ========================================================
echo.

:: Get the directory where this script is located
set "SCRIPTDIR=%~dp0"
cd /d "%SCRIPTDIR%"

:: Check if trip-manager.py exists
if not exist "trip-manager.py" (
    echo  ❌ Error: trip-manager.py not found!
    echo  Make sure this script is in the 'admin' folder.
    pause
    exit /b 1
)

:: Install tkinter check (usually comes with Python on Windows)
echo  Checking Python tkinter...
python -c "import tkinter" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  ❌ tkinter not available. Please reinstall Python with tcl/tk support.
    pause
    exit /b 1
)
echo  ✅ All dependencies ready!
echo.

:: Run the Trip Manager
echo  Launching Trip Manager GUI...
echo.
echo  --------------------------------------------------------
echo   TIP: Use "Deploy to GitHub" button to push changes
echo   The tool will automatically sync with the remote repo
echo  --------------------------------------------------------
echo.

python trip-manager.py

:: If we get here, the app closed
echo.
echo  Trip Manager closed.
pause
