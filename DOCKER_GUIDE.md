# 🐳 Docker Deployment Guide

Complete guide to running the MCP Chat App with Docker.

## 🎯 What Docker Does

Docker packages your entire application into containers:

```
┌─────────────────────────────────────────┐
│         Docker Compose                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │ Frontend │  │ Backend  │  │ Mongo│ │
│  │ Next.js  │  │ FastAPI  │  │  DB  │ │
│  │   :3000  │  │   :8000  │  │:27017│ │
│  └──────────┘  └──────────┘  └──────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ Works the same everywhere
- ✅ No manual setup needed
- ✅ Easy to deploy
- ✅ Isolated environment

---

## 📋 Prerequisites

### Install Docker

**macOS:**
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

**Ubuntu/Linux:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

**Windows:**
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Verify in PowerShell
docker --version
docker-compose --version
```

---

## 🚀 Quick Start

### 1. Set Up Environment

```bash
cd mcp-chat-app

# Copy environment template
cp .env.example .env.local

# Edit .env.local
nano .env.local  # or use your favorite editor
```

**Add your API key:**
```env
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### 2. Build and Start

```bash
# Build images (first time only)
docker-compose build

# Start all services
docker-compose up -d
```

**What's happening:**
- 📦 Building Docker images (takes 2-5 minutes first time)
- 🚀 Starting MongoDB
- 🚀 Starting FastAPI backend
- 🚀 Starting Next.js frontend

### 3. Check Status

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f
```

**Expected output:**
```
NAME            STATUS          PORTS
mcp-mongodb     Up 30 seconds   0.0.0.0:27017->27017/tcp
mcp-backend     Up 28 seconds   0.0.0.0:8000->8000/tcp
mcp-frontend    Up 26 seconds   0.0.0.0:3000->3000/tcp
```

### 4. Populate Sample Data

```bash
# Run populate script inside container
docker exec mcp-backend python populate_data.py
```

### 5. Open Application

**Open your browser:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- MongoDB: localhost:27017

---

## 🔧 Docker Commands

### Basic Operations

```bash
# Start services (in foreground)
docker-compose up

# Start services (in background)
docker-compose up -d

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (deletes data!)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Rebuilding

```bash
# Rebuild all images
docker-compose build

# Rebuild without cache (clean build)
docker-compose build --no-cache

# Rebuild specific service
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build
```

### Accessing Containers

```bash
# Execute command in container
docker exec -it mcp-backend bash
docker exec -it mcp-frontend sh
docker exec -it mcp-mongodb mongosh

# Run Python script
docker exec mcp-backend python populate_data.py

# Check backend health
docker exec mcp-backend curl http://localhost:8000/health
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Problem:**
```
Error: bind: address already in use
```

**Solution:**
```bash
# Check what's using the port
lsof -i :3000  # or :8000, :27017

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
# Change "3000:3000" to "3001:3000"
```

### Container Won't Start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**

1. **Missing API key:**
   ```bash
   # Check if .env.local exists
   ls -la .env.local
   
   # Recreate it
   cp .env.example .env.local
   # Add your ANTHROPIC_API_KEY
   ```

2. **MongoDB not ready:**
   ```bash
   # MongoDB takes a few seconds to start
   # Wait and check:
   docker-compose ps mongodb
   ```

3. **Build failed:**
   ```bash
   # Clean rebuild
   docker-compose down -v
   docker-compose build --no-cache
   docker-compose up -d
   ```

### "Cannot connect to backend"

**From frontend container:**

```bash
# Check if backend is accessible
docker exec mcp-frontend curl http://backend:8000/health

# If it fails, check backend logs
docker-compose logs backend
```

### Image Too Large

**Reduce image size:**

Images are optimized with multi-stage builds, but you can:

```bash
# Remove unused images
docker image prune -a

# Check image sizes
docker images | grep mcp
```

### Permission Errors (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, or:
newgrp docker
```

---

## 📊 Monitoring

### Resource Usage

```bash
# View resource usage
docker stats

# View specific container
docker stats mcp-backend
```

### Health Checks

```bash
# Check backend health
curl http://localhost:8000/health

# Check MongoDB
docker exec mcp-mongodb mongosh --eval "db.runCommand('ping')"

# Check frontend (should return HTML)
curl http://localhost:3000
```

---

## 🔄 Updating Code

### After Code Changes

```bash
# Stop services
docker-compose down

# Rebuild affected services
docker-compose build frontend  # if frontend changed
docker-compose build backend   # if backend changed

# Restart
docker-compose up -d
```

### Quick Reload (Development)

For development, you can mount volumes:

**Edit `docker-compose.yml`:**

```yaml
  frontend:
    # ... existing config ...
    volumes:
      - ./src:/app/src          # Live reload for frontend
      - ./package.json:/app/package.json

  backend:
    # ... existing config ...
    volumes:
      - ./backend:/app          # Live reload for backend
    command: uvicorn main_simple_mcp:app --host 0.0.0.0 --reload
```

Then restart:
```bash
docker-compose up -d
```

---

## 🗄️ Data Management

### Backup MongoDB Data

```bash
# Backup
docker exec mcp-mongodb mongodump --out /dump

# Copy to host
docker cp mcp-mongodb:/dump ./mongodb-backup

# Restore
docker cp ./mongodb-backup mcp-mongodb:/dump
docker exec mcp-mongodb mongorestore /dump
```

### Reset Database

```bash
# Stop services
docker-compose down -v  # -v removes volumes

# Start fresh
docker-compose up -d

# Re-populate data
docker exec mcp-backend python populate_data.py
```

---

## 🚢 Production Deployment

### Environment Variables

**Create `.env.production`:**

```env
ANTHROPIC_API_KEY=your-production-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
MONGODB_URL=mongodb://your-mongo-host:27017
```

**Use it:**

```bash
docker-compose --env-file .env.production up -d
```

### Security Hardening

**1. Don't expose MongoDB publicly:**

```yaml
# In docker-compose.yml
mongodb:
  ports:
    # Remove this line or comment it out:
    # - "27017:27017"
```

**2. Use secrets for API keys:**

```yaml
secrets:
  anthropic_key:
    file: ./secrets/anthropic_key.txt

services:
  frontend:
    secrets:
      - anthropic_key
    environment:
      - ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic_key
```

**3. Use production builds:**

Already configured in Dockerfiles!

---

## 🌐 Deploying to Cloud

### AWS ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker tag mcp-chat-app-frontend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/mcp-frontend:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/mcp-frontend:latest
```

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### DigitalOcean App Platform

1. Connect GitHub repository
2. App Platform auto-detects Docker setup
3. Add environment variables
4. Deploy!

---

## 📈 Performance Tips

### Optimize Images

```bash
# Multi-stage builds already implemented
# Check image sizes:
docker images | grep mcp

# Should be:
# Frontend: ~200-300MB
# Backend: ~400-500MB
```

### Network Optimization

```yaml
# Use bridge network (already configured)
networks:
  mcp-network:
    driver: bridge
```

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 🧪 Testing in Docker

```bash
# Run tests in container
docker-compose run --rm backend pytest
docker-compose run --rm frontend npm test

# Interactive debugging
docker exec -it mcp-backend python
```

---

## 📋 Checklist for Production

- [ ] Environment variables set
- [ ] MongoDB authentication enabled
- [ ] HTTPS configured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Resource limits set
- [ ] Logs aggregation
- [ ] Health checks enabled

---

## 🆘 Getting Help

**Common issues:**
1. Check logs first: `docker-compose logs -f`
2. Verify .env.local exists
3. Check port conflicts
4. Restart: `docker-compose restart`

**Still stuck?**
- Docker docs: https://docs.docker.com
- Our README: See `README.md`
- GitHub issues: Report problems

---

**Your app is now containerized! 🐳**
