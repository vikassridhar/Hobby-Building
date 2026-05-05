#!/bin/bash
# Docker deployment script for OTA Website with Gemma 4

set -e

echo "=== OTA Website Docker Deployment ==="
echo "Using Gemma 4 LLM on port 8000"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker."
    exit 1
fi

# Check if Gemma 4 is available on host
echo ""
echo "Checking Gemma 4 availability on port 8000..."
if curl -s http://host.docker.internal:8000/v1/models 2>/dev/null | grep -q "gemma-4"; then
    echo "✅ Gemma 4 is available"
else
    echo "⚠️  Warning: Gemma 4 not responding on port 8000"
    echo "   Make sure vLLM is running with Gemma 4 loaded"
fi

# Build and start containers
echo ""
echo "Building and starting containers..."
docker-compose down 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
echo ""
echo "Waiting for services to start..."
sleep 5

# Check health
echo ""
echo "Checking service health..."
if curl -s http://localhost:3001/api/chat -X POST \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}]}' > /dev/null 2>&1; then
    echo "✅ API server is responding on port 3001"
else
    echo "⚠️  API server may still be starting, checking logs..."
    docker-compose logs --tail=20 ota-website
fi

if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Website is available on port 8080"
else
    echo "⚠️  Website may still be starting..."
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Services:"
echo "  🌐 Website:    http://localhost:8080"
echo "  🔌 API:        http://localhost:3001"
echo "  🤖 LLM:        Gemma 4 on port 8000 (host)"
echo ""
echo "Commands:"
echo "  View logs:    docker-compose logs -f"
echo "  Stop:         docker-compose down"
echo "  Restart:      docker-compose restart"
echo ""
