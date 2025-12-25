#!/bin/bash
# Docker entrypoint for Trip Manager
# Handles SSH key mounting and Git configuration

echo "🏔️ Trip Manager Docker Container Starting..."

# Copy SSH keys from mounted volume
if [ -d "/ssh-keys" ]; then
    echo "📋 Copying SSH keys..."
    cp -r /ssh-keys/* /root/.ssh/ 2>/dev/null || true
    chmod 700 /root/.ssh
    chmod 600 /root/.ssh/* 2>/dev/null || true
    chmod 644 /root/.ssh/*.pub 2>/dev/null || true
    echo "✅ SSH keys configured"
fi

# Ensure GitHub is in known hosts
ssh-keyscan github.com >> /root/.ssh/known_hosts 2>/dev/null

# Configure Git if not already configured
if [ -z "$(git config --global user.name)" ]; then
    git config --global user.name "Trip Manager"
fi
if [ -z "$(git config --global user.email)" ]; then
    git config --global user.email "admin@teamweekendtrekkers.com"
fi

# Navigate to project admin folder
cd /project/admin

echo "🚀 Starting Trip Manager GUI..."
echo ""

# Execute the main command
exec "$@"
