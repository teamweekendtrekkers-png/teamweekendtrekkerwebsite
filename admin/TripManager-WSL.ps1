# ============================================================
# Trip Manager - WSL Launcher (PowerShell)
# Right-click and "Run with PowerShell" or double-click
# ============================================================

$Host.UI.RawUI.WindowTitle = "Trip Manager - WSL Setup"

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "     Trip Manager - WSL Setup" -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

# Check if WSL is installed
$wslStatus = wsl --status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WSL is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Installing WSL... (requires admin privileges)" -ForegroundColor Yellow
    Write-Host "  After installation, RESTART your computer and run this again." -ForegroundColor Yellow
    Write-Host ""
    Start-Process wsl -ArgumentList "--install" -Verb RunAs
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Ubuntu is properly installed (test for apt)
wsl -e apt --version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ========================================================" -ForegroundColor Red
    Write-Host "   Ubuntu Linux is not installed in WSL!" -ForegroundColor Red
    Write-Host "  ========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Installing Ubuntu... This may take 5-10 minutes." -ForegroundColor Yellow
    Write-Host ""
    wsl --install -d Ubuntu
    Write-Host ""
    Write-Host "  ========================================================" -ForegroundColor Yellow
    Write-Host "   IMPORTANT: After Ubuntu installs:" -ForegroundColor Yellow
    Write-Host "   1. A new window will open asking for username/password" -ForegroundColor White
    Write-Host "   2. Create a username and password" -ForegroundColor White
    Write-Host "   3. Close that window" -ForegroundColor White
    Write-Host "   4. RESTART your computer" -ForegroundColor White
    Write-Host "   5. Run this script again" -ForegroundColor White
    Write-Host "  ========================================================" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  WSL Ubuntu detected!" -ForegroundColor Green
Write-Host ""

# Install dependencies using bash explicitly
Write-Host "  [1/2] Installing Python3 and dependencies..." -ForegroundColor Yellow
wsl -e bash -c "sudo apt-get update -qq && sudo apt-get install -y python3 python3-tk git"
Write-Host "        Done." -ForegroundColor Green
Write-Host ""

Write-Host "  [2/2] Cloning/updating project..." -ForegroundColor Yellow
wsl -e bash -c "if [ ! -d ~/TravelBooking ]; then git clone git@github.com:teamweekendtrekkers-png/teamweekendtrekkerwebsite.git ~/TravelBooking; else cd ~/TravelBooking && git pull; fi"
Write-Host "        Done." -ForegroundColor Green
Write-Host ""

Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "     Starting Trip Manager..." -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

# Run Trip Manager with bash
wsl -e bash -c "cd ~/TravelBooking/admin && python3 trip-manager.py"

Write-Host ""
Write-Host "  Trip Manager closed." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
