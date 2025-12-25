# 🏔️ Trip Manager - Windows Setup Guide

## Quick Start (Docker Method - Recommended)

### One-Click Setup:
1. **Double-click `TripManager-Docker.bat`**
2. Follow the prompts to install Docker Desktop (if needed)
3. The script will automatically:
   - ✅ Install VcXsrv (X Server for GUI)
   - ✅ Set up SSH keys for GitHub
   - ✅ Build the Docker container
   - ✅ Launch Trip Manager

### Requirements (Auto-installed):
- Docker Desktop
- VcXsrv (downloaded automatically)

---

## Alternative: Direct Python Method

### Prerequisites:
1. **Python 3.10+** - [Download](https://www.python.org/downloads/)
   - ⚠️ Check "Add Python to PATH" during installation
2. **Git** - [Download](https://git-scm.com/download/win)

### Setup:
1. Double-click `TripManager-Windows.bat`
2. Follow the SSH key setup prompts
3. Add your SSH key to GitHub

---

## Using Trip Manager

### Managing Trips:
- **All Trips** - View and edit existing trips
- **Add New Trip** - Create new trek/trip
- **Featured Trips** - Select trips for homepage
- **Photo Manager** - Manage trip images

### Deploying to Website:
1. Make your changes
2. Click **"💾 Save Changes"**
3. Click **"🚀 Deploy to GitHub"**
4. Enter a commit message
5. Click **"Deploy Now"**
6. Website updates in 1-2 minutes!

---

## Troubleshooting

### "Docker not running"
- Open Docker Desktop and wait for it to start
- Look for the whale icon in system tray

### "SSH key not working"
1. Go to https://github.com/settings/keys
2. Delete old keys
3. Run setup again to generate new key
4. Add the new key to GitHub

### "GUI not showing"
- Make sure VcXsrv is running (icon in system tray)
- Try restarting the script

### "Permission denied (publickey)"
- Your SSH key isn't added to GitHub
- Copy key from `%USERPROFILE%\.ssh\id_ed25519.pub`
- Add at https://github.com/settings/ssh/new
