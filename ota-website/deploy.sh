#!/bin/bash
# Deploy OTA Website with Gemma 4 LLM

echo "=== OTA Website Deployment ==="
echo "Using Gemma 4 on port 8000"

# Check if Gemma 4 is available
echo "Checking Gemma 4 availability..."
if curl -s http://host.docker.internal:8000/v1/models | grep -q "gemma-4"; then
    echo "✅ Gemma 4 is available on port 8000"
else
    echo "❌ Gemma 4 not found on port 8000"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Build the frontend
echo "Building frontend..."
pnpm run build

# Start the proxy server in background
echo "Starting proxy server on port 3001..."
node proxy-server.js &
PROXY_PID=$!

# Wait for proxy to start
sleep 2

# Check if proxy is running
if curl -s http://localhost:3001/api/chat -X POST -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"test"}]}' > /dev/null 2>&1; then
    echo "✅ Proxy server is running"
else
    echo "⚠️  Proxy server may still be starting..."
fi

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: http://localhost:5173 (vite dev) or static files in dist/"
echo "Proxy API: http://localhost:3001"
echo "LLM: Gemma 4 on port 8000"
echo ""
echo "To stop: kill $PROXY_PID"
