@echo off
setlocal EnableDelayedExpansion
title 🏔️ Trip Manager - Docker Edition
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║     🏔️  Team Weekend Trekkers - Trip Manager            ║
echo  ║                  Docker Edition                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: STEP 1: Check if Docker is installed
:: ============================================================
echo  [1/4] Checking Docker installation...

where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ❌ Docker Desktop is NOT installed!
    echo.
    echo  Would you like to download Docker Desktop now?
    echo.
    choice /C YN /M "  Download Docker Desktop"
    if !ERRORLEVEL! EQU 1 (
        echo.
        echo  📥 Opening Docker Desktop download page...
        start https://www.docker.com/products/docker-desktop/
        echo.
        echo  After installing Docker Desktop:
        echo  1. Restart your computer
        echo  2. Open Docker Desktop and wait for it to start
        echo  3. Run this script again
    )
    echo.
    pause
    exit /b 1
)

:: Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ⚠️  Docker Desktop is installed but not running!
    echo.
    echo  Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo.
    echo  Please wait for Docker Desktop to start (this may take a minute)...
    echo  Then run this script again.
    echo.
    pause
    exit /b 1
)

echo       ✅ Docker Desktop is running
echo.

:: ============================================================
:: STEP 2: Check/Install VcXsrv X Server
:: ============================================================
echo  [2/4] Checking X Server for GUI display...

set "VCXSRV_PATH="
if exist "%ProgramFiles%\VcXsrv\vcxsrv.exe" (
    set "VCXSRV_PATH=%ProgramFiles%\VcXsrv\vcxsrv.exe"
) else if exist "%ProgramFiles(x86)%\VcXsrv\vcxsrv.exe" (
    set "VCXSRV_PATH=%ProgramFiles(x86)%\VcXsrv\vcxsrv.exe"
)

if "!VCXSRV_PATH!"=="" (
    echo.
    echo  📥 VcXsrv X Server not found. Downloading...
    echo.
    
    :: Download VcXsrv installer
    powershell -Command "& { $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/ArcticaProject/vcxsrv/releases/download/21.1.13/vcxsrv-64.21.1.13.0.installer.exe' -OutFile '%TEMP%\vcxsrv-installer.exe' }"
    
    if exist "%TEMP%\vcxsrv-installer.exe" (
        echo  📦 Installing VcXsrv...
        "%TEMP%\vcxsrv-installer.exe" /S
        timeout /t 5 >nul
        set "VCXSRV_PATH=%ProgramFiles%\VcXsrv\vcxsrv.exe"
        echo       ✅ VcXsrv installed successfully
    ) else (
        echo  ⚠️  Could not download VcXsrv automatically.
        echo  Please download manually from: https://vcxsrv.com/
        pause
        exit /b 1
    )
) else (
    echo       ✅ VcXsrv found
)
echo.

:: ============================================================
:: STEP 3: Start X Server
:: ============================================================
echo  [3/4] Starting X Server...

:: Check if VcXsrv is already running
tasklist /FI "IMAGENAME eq vcxsrv.exe" 2>NUL | find /I /N "vcxsrv.exe">NUL
if %ERRORLEVEL% NEQ 0 (
    :: Start VcXsrv with settings that work for Docker
    start "" "!VCXSRV_PATH!" :0 -multiwindow -clipboard -wgl -ac -silent-dup-error
    timeout /t 3 >nul
    echo       ✅ X Server started
) else (
    echo       ✅ X Server already running
)
echo.

:: ============================================================
:: STEP 4: Check SSH Keys
:: ============================================================
echo  [4/4] Checking SSH keys...

set "SSH_DIR=%USERPROFILE%\.ssh"
set "SSH_KEY=%SSH_DIR%\id_ed25519"

if not exist "%SSH_DIR%" (
    echo       Creating SSH directory...
    mkdir "%SSH_DIR%"
)

if not exist "%SSH_KEY%" (
    if not exist "%SSH_DIR%\id_rsa" (
        echo.
        echo  ⚠️  No SSH key found!
        echo.
        echo  You need an SSH key to push to GitHub.
        echo.
        choice /C YN /M "  Generate a new SSH key now"
        if !ERRORLEVEL! EQU 1 (
            set /p "EMAIL=  Enter your GitHub email: "
            ssh-keygen -t ed25519 -C "!EMAIL!" -f "%SSH_KEY%" -N ""
            echo.
            echo  ✅ SSH key created!
            echo.
            echo  ════════════════════════════════════════════════════════
            echo   📋 YOUR SSH PUBLIC KEY (add this to GitHub):
            echo  ════════════════════════════════════════════════════════
            echo.
            type "%SSH_KEY%.pub"
            echo.
            echo  ════════════════════════════════════════════════════════
            echo.
            echo  Add this key to GitHub:
            echo  1. Go to: https://github.com/settings/ssh/new
            echo  2. Title: "Trip Manager - %COMPUTERNAME%"
            echo  3. Paste the key above and click "Add SSH key"
            echo.
            start https://github.com/settings/ssh/new
            echo  Press any key after adding the SSH key to GitHub...
            pause >nul
        ) else (
            echo.
            echo  ⚠️  Without SSH key, you won't be able to deploy to GitHub.
            echo  You can still use the tool to manage trips locally.
        )
    ) else (
        echo       ✅ SSH key found (id_rsa)
    )
) else (
    echo       ✅ SSH key found (id_ed25519)
)
echo.

:: ============================================================
:: BUILD AND RUN DOCKER CONTAINER
:: ============================================================
echo  ════════════════════════════════════════════════════════════
echo     🐳 Building and Starting Trip Manager...
echo  ════════════════════════════════════════════════════════════
echo.

:: Navigate to docker folder
cd /d "%~dp0docker"

:: Build the Docker image
echo  📦 Building Docker image (first time may take a few minutes)...
docker-compose build --quiet
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ❌ Docker build failed!
    echo  Please check the error messages above.
    pause
    exit /b 1
)

echo  ✅ Docker image ready
echo.

:: Run the container
echo  🚀 Launching Trip Manager...
echo.
echo  ────────────────────────────────────────────────────────────
echo   TIP: Click "Deploy to GitHub" to push changes to website
echo   Your SSH keys are automatically mounted in the container
echo  ────────────────────────────────────────────────────────────
echo.

docker-compose run --rm trip-manager

:: Cleanup
echo.
echo  Trip Manager closed.
echo.
pause
