# ============================================================
# Trip Manager - WSL Launcher (PowerShell)
# Right-click and "Run with PowerShell" or double-click
# ============================================================

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "     Trip Manager - Starting in WSL Ubuntu..." -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

# Run Trip Manager in WSL
wsl -d Ubuntu python3 /home/simplifybytes/TravelBooking/admin/trip-manager.py

Write-Host ""
Write-Host "  Trip Manager closed." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
