# ============================================================
# Trip Manager - WSL Launcher (PowerShell)
# Right-click and "Run with PowerShell" or double-click
# ============================================================

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "     Trip Manager - Starting in WSL..." -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

# Run Trip Manager in default WSL
wsl python3 /home/simplifybytes/TravelBooking/admin/trip-manager.py

Write-Host ""
Write-Host "  Trip Manager closed." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
