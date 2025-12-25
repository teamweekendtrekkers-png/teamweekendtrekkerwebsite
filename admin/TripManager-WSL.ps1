# ============================================================
# Trip Manager - WSL Launcher (PowerShell)
# Right-click and "Run with PowerShell" or double-click
# ============================================================

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "     Trip Manager - Setting up WSL environment..." -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python3
Write-Host "  [1/3] Checking Python3..." -ForegroundColor Yellow
$pythonCheck = wsl which python3 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "        Installing Python3..." -ForegroundColor Gray
    wsl sudo apt-get update -qq
    wsl sudo apt-get install -y python3 python3-tk
}
Write-Host "        Done." -ForegroundColor Green

# Check Tkinter
Write-Host "  [2/3] Checking Tkinter..." -ForegroundColor Yellow
wsl python3 -c "import tkinter" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "        Installing python3-tk..." -ForegroundColor Gray
    wsl sudo apt-get install -y python3-tk
}
Write-Host "        Done." -ForegroundColor Green

# Check Git
Write-Host "  [3/3] Checking Git..." -ForegroundColor Yellow
$gitCheck = wsl which git 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "        Installing Git..." -ForegroundColor Gray
    wsl sudo apt-get install -y git
}
Write-Host "        Done." -ForegroundColor Green

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "     Starting Trip Manager..." -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

# Run Trip Manager
wsl python3 /home/simplifybytes/TravelBooking/admin/trip-manager.py

Write-Host ""
Write-Host "  Trip Manager closed." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
