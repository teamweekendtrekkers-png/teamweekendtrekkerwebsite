@echo off
setlocal enabledelayedexpansion
title Team Weekend Trekkers - Setup Wizard
color 0A

echo.
echo  ============================================================
echo     TEAM WEEKEND TREKKERS - WINDOWS SETUP WIZARD
echo  ============================================================
echo.
echo  This wizard will set up everything you need to manage
echo  your travel website from Windows.
echo.
echo  ============================================================
echo.
pause

REM ============================================================
REM CHECK PYTHON
REM ============================================================
echo.
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Python is not installed!
    echo.
    echo  Please download Python from:
    echo  https://www.python.org/downloads/
    echo.
    echo  IMPORTANT: During installation, CHECK the box that says:
    echo  "Add Python to PATH"
    echo.
    echo  After installing Python, run this setup again.
    echo.
    pause
    start https://www.python.org/downloads/
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do echo  [OK] %%i installed
)

REM ============================================================
REM CHECK GIT
REM ============================================================
echo.
echo [2/5] Checking Git installation...
git --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Git is not installed!
    echo.
    echo  Please download Git from:
    echo  https://git-scm.com/download/win
    echo.
    echo  Use all default options during installation.
    echo.
    echo  After installing Git, run this setup again.
    echo.
    pause
    start https://git-scm.com/download/win
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('git --version') do echo  [OK] %%i
)

REM ============================================================
REM SETUP SSH DIRECTORY
REM ============================================================
echo.
echo [3/5] Setting up SSH keys...

set "SSH_DIR=%USERPROFILE%\.ssh"

if not exist "%SSH_DIR%" (
    echo  Creating SSH directory...
    mkdir "%SSH_DIR%"
)

REM Check if keys exist
if exist "%SSH_DIR%\id_ed25519" (
    echo  [OK] SSH keys already configured
    goto :ssh_done
)

if exist "%SSH_DIR%\id_rsa" (
    echo  [OK] SSH keys already configured (RSA)
    goto :ssh_done
)

echo.
echo  SSH keys need to be configured!
echo.
echo  --------------------------------------------------------
echo  You need to copy your SSH keys from Linux to Windows.
echo  --------------------------------------------------------
echo.
echo  On your Linux machine, run these commands:
echo.
echo    cat ~/.ssh/id_ed25519
echo    cat ~/.ssh/id_ed25519.pub
echo.
echo  Then copy those files to: %SSH_DIR%
echo.
echo  --------------------------------------------------------
echo.
echo  Opening SSH folder for you...
start "" "%SSH_DIR%"
echo.
echo  After copying SSH keys, press any key to continue...
pause >nul

:ssh_done

REM Add GitHub to known hosts to avoid prompt
echo  Adding GitHub to known hosts...
if not exist "%SSH_DIR%\known_hosts" (
    echo. > "%SSH_DIR%\known_hosts"
)
findstr /C:"github.com" "%SSH_DIR%\known_hosts" >nul 2>&1
if errorlevel 1 (
    echo github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl>> "%SSH_DIR%\known_hosts"
    echo github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q4zMjA2n1nGrlTDkzwDCsw+wqFPGQA179cnfGWOWRVruj16z6XyvxvjJwbz0wQZ75XK5tKSb7FNyeIEs4TT4jk+S4dhPeAUC5y+bDYirYgM4GC7uEnztnZyaVWQ7B381AK4Qdrwt51ZqExKbQpTUNn+EjqoTwvqNj4kqx5QUCI0ThS/YkOxJCXmPUWZbhjpCg56i+2aB6CmK2JGhn57K5mj0MNdBXA4/WnwH6XoPWJzK5Nyu2zB3nAZp+S5hpQs+p1vN1/wsjk=>> "%SSH_DIR%\known_hosts"
)
echo  [OK] GitHub added to known hosts

REM ============================================================
REM CONFIGURE GIT
REM ============================================================
echo.
echo [4/5] Checking Git configuration...

for /f "tokens=*" %%i in ('git config --global user.name 2^>nul') do set "GIT_USER=%%i"
for /f "tokens=*" %%i in ('git config --global user.email 2^>nul') do set "GIT_EMAIL=%%i"

if "!GIT_USER!"=="" (
    echo.
    echo  Git user name not configured.
    set /p GIT_USER="  Enter your name: "
    git config --global user.name "!GIT_USER!"
)
echo  [OK] Git user: !GIT_USER!

if "!GIT_EMAIL!"=="" (
    echo.
    echo  Git email not configured.
    set /p GIT_EMAIL="  Enter your email: "
    git config --global user.email "!GIT_EMAIL!"
)
echo  [OK] Git email: !GIT_EMAIL!

REM ============================================================
REM CREATE DESKTOP SHORTCUT
REM ============================================================
echo.
echo [5/5] Creating desktop shortcut...

set "SCRIPT_DIR=%~dp0"
set "DESKTOP=%USERPROFILE%\Desktop"

REM Create VBS script to make shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\shortcut.vbs"
echo sLinkFile = "%DESKTOP%\Trip Manager.lnk" >> "%TEMP%\shortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\shortcut.vbs"
echo oLink.TargetPath = "pythonw.exe" >> "%TEMP%\shortcut.vbs"
echo oLink.Arguments = """%SCRIPT_DIR%trip-manager.py""" >> "%TEMP%\shortcut.vbs"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%.." >> "%TEMP%\shortcut.vbs"
echo oLink.Description = "Team Weekend Trekkers - Trip Manager" >> "%TEMP%\shortcut.vbs"
echo oLink.Save >> "%TEMP%\shortcut.vbs"
cscript //nologo "%TEMP%\shortcut.vbs"
del "%TEMP%\shortcut.vbs"

if exist "%DESKTOP%\Trip Manager.lnk" (
    echo  [OK] Created "Trip Manager" shortcut on Desktop
) else (
    echo  [WARNING] Could not create desktop shortcut
)

REM ============================================================
REM TEST GIT CONNECTION
REM ============================================================
echo.
echo Testing GitHub SSH connection...
ssh -T git@github.com 2>&1 | findstr /C:"successfully authenticated" /C:"Hi " >nul
if errorlevel 1 (
    echo  [WARNING] Could not verify GitHub connection
    echo.
    echo  If deployment fails later, make sure:
    echo    1. SSH keys are in %SSH_DIR%
    echo    2. Public key is added to GitHub:
    echo       GitHub ^> Settings ^> SSH and GPG Keys ^> New SSH Key
    echo.
) else (
    echo  [OK] GitHub SSH connection verified!
)

REM ============================================================
REM DONE
REM ============================================================
echo.
echo  ============================================================
echo     SETUP COMPLETE!
echo  ============================================================
echo.
echo  You can now:
echo.
echo    1. Double-click "Trip Manager" on your Desktop
echo       (or run: python "%SCRIPT_DIR%trip-manager.py")
echo.
echo    2. Make changes to trips, dates, photos, etc.
echo.
echo    3. Click "Save Changes" to save locally
echo.
echo    4. Click "Deploy to GitHub" to publish to website
echo.
echo  ============================================================
echo.

choice /C YN /M "Would you like to start Trip Manager now"
if errorlevel 2 (
    echo.
    echo  Setup complete. Start Trip Manager from your Desktop.
) else (
    echo.
    echo  Starting Trip Manager...
    start "" pythonw "%SCRIPT_DIR%trip-manager.py"
)

echo.
pause
