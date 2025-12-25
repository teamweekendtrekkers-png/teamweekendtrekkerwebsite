#!/bin/bash
# ============================================================
# 🏔️ Trip Manager - WSL Launcher
# ============================================================
# Run this script to launch the Trip Manager GUI in WSL
# Usage: ./run-trip-manager.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║     🏔️  Team Weekend Trekkers - Trip Manager            ║"
echo "  ║                    WSL Edition                           ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo ""

# Check Python
echo "  [1/3] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "  ❌ Python3 not found. Installing..."
    sudo apt-get update && sudo apt-get install -y python3 python3-tk
fi
echo "       ✅ Python3 ready"

# Check tkinter
echo "  [2/3] Checking Tkinter..."
if ! python3 -c "import tkinter" &> /dev/null; then
    echo "  📦 Installing python3-tk..."
    sudo apt-get update && sudo apt-get install -y python3-tk
fi
echo "       ✅ Tkinter ready"

# Check Git
echo "  [3/3] Checking Git..."
if ! command -v git &> /dev/null; then
    echo "  📦 Installing Git..."
    sudo apt-get update && sudo apt-get install -y git
fi
echo "       ✅ Git ready"

echo ""

# Check SSH key
if [ ! -f "$HOME/.ssh/id_ed25519" ] && [ ! -f "$HOME/.ssh/id_rsa" ]; then
    echo "  ⚠️  No SSH key found for GitHub!"
    echo ""
    read -p "  Generate SSH key now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "  Enter your GitHub email: " email
        ssh-keygen -t ed25519 -C "$email" -f "$HOME/.ssh/id_ed25519" -N ""
        echo ""
        echo "  ════════════════════════════════════════════════════════"
        echo "  📋 YOUR SSH PUBLIC KEY (add this to GitHub):"
        echo "  ════════════════════════════════════════════════════════"
        echo ""
        cat "$HOME/.ssh/id_ed25519.pub"
        echo ""
        echo "  ════════════════════════════════════════════════════════"
        echo ""
        echo "  Add this key to GitHub:"
        echo "  1. Go to: https://github.com/settings/ssh/new"
        echo "  2. Paste the key above"
        echo "  3. Click 'Add SSH key'"
        echo ""
        read -p "  Press Enter after adding the key to GitHub..."
    fi
fi

# Set DISPLAY for WSL GUI
if [ -z "$DISPLAY" ]; then
    # WSL2
    if grep -qi microsoft /proc/version 2>/dev/null; then
        export DISPLAY=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):0.0
    else
        export DISPLAY=:0
    fi
fi

echo "  ════════════════════════════════════════════════════════════"
echo "     🚀 Starting Trip Manager..."
echo "  ════════════════════════════════════════════════════════════"
echo ""
echo "  TIP: Use 'Deploy to GitHub' button to push changes"
echo ""

cd "$SCRIPT_DIR"
python3 trip-manager.py

echo ""
echo "  Trip Manager closed."
