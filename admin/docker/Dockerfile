# Trip Manager Docker Image
# Includes Python, Tkinter, Git, and SSH support for Windows

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    python3-tk \
    tk \
    x11-apps \
    libx11-6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create SSH directory with correct permissions
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh

# Add GitHub to known hosts
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts 2>/dev/null

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set display for X11 forwarding (Windows Docker Desktop)
ENV DISPLAY=host.docker.internal:0.0

# Entry point
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python3", "trip-manager.py"]
