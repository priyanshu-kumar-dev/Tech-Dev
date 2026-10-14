#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================
# RoadGuard AI - Deployment Script
# ==========================================

PROJECT_NAME="roadguard-ai"

echo "=========================================="
echo " Deploying ${PROJECT_NAME}"
echo "=========================================="

# Check required tools
for cmd in docker; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "ERROR: $cmd is not installed."
        exit 1
    fi
done

# Verify Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not running."
    exit 1
fi

# Verify Docker Compose
if ! docker compose version >/dev/null 2>&1; then
    echo "ERROR: Docker Compose is unavailable."
    exit 1
fi

# Verify project configuration
if [[ ! -f "docker-compose.yml" && ! -f "compose.yaml" && ! -f "compose.yml" && ! -f "docker-compose.yaml" ]]; then
    echo "ERROR: Docker Compose configuration not found."
    echo "Create a compose.yaml or docker-compose.yml file first."
    exit 1
fi

# Build and deploy
echo "[1/3] Building application images..."
docker compose build

echo "[2/3] Starting application services..."
docker compose up -d --remove-orphans

echo "[3/3] Checking service status..."
docker compose ps

echo "=========================================="
echo " Deployment command completed!"
echo " Check service health and application logs."
echo "=========================================="

docker compose logs --tail=50