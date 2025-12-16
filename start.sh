#!/bin/bash

# MCP Chat App - Quick Start Script
# This script sets up and runs the entire application

set -e  # Exit on error

echo "🚀 MCP Chat App - Quick Start"
echo "=============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker is installed"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

echo "✅ Docker Compose is available"
echo ""

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️  No .env.local file found!"
    echo ""
    echo "Creating .env.local from template..."
    cp .env.example .env.local
    
    echo ""
    echo "📝 IMPORTANT: You need to add your Anthropic API key!"
    echo ""
    echo "1. Go to: https://console.anthropic.com/"
    echo "2. Create an API key"
    echo "3. Edit .env.local and replace 'sk-ant-your-key-here' with your actual key"
    echo ""
    read -p "Press Enter once you've added your API key to .env.local..."
fi

echo ""
echo "🐳 Starting Docker containers..."
echo ""

# Build and start containers
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
else
    echo "❌ Services failed to start. Check logs:"
    echo "   docker-compose logs"
    exit 1
fi

echo ""
echo "📦 Populating sample data..."
docker exec mcp-backend python populate_data.py

echo ""
echo "🎉 Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Your app is running at:"
echo ""
echo "  🌐 Frontend:  http://localhost:3000"
echo "  🔧 Backend:   http://localhost:8000/docs"
echo "  💾 MongoDB:   localhost:27017"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Useful commands:"
echo "   docker-compose logs -f          # View logs"
echo "   docker-compose stop             # Stop services"
echo "   docker-compose down             # Stop and remove"
echo "   docker-compose restart          # Restart all"
echo ""
echo "Happy chatting! 🤖"
