#!/bin/bash
# Start OTA Website with Gemma 4 LLM
# Runs Vite dev server on port 5173 and proxy server on port 3001

echo "=== Starting OTA Website ==="
echo "Using Gemma 4 LLM on port 8000"
echo ""

# Check if Gemma 4 is available
echo "Checking Gemma 4 availability..."
if curl -s http://host.docker.internal:8000/v1/models 2>/dev/null | grep -q "gemma-4"; then
    echo "✅ Gemma 4 is available on port 8000"
else
    echo "⚠️  Warning: Gemma 4 not responding on port 8000"
    echo "   Make sure vLLM is running with Gemma 4 loaded"
fi

echo ""
echo "Starting services..."
echo ""

# Start proxy server in background
echo "🔌 Starting proxy server on port 3001..."
node proxy-server.js &
PROXY_PID=$!

# Wait for proxy to start
sleep 2

# Check if proxy started successfully
if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo "❌ Proxy server failed to start"
    exit 1
fi

echo "✅ Proxy server running (PID: $PROXY_PID)"
echo ""

# Start Vite dev server
echo "🌐 Starting Vite dev server on port 5173..."
echo "   (This will take a moment...)"
echo ""

# Trap Ctrl+C to kill both processes
trap 'echo ""; echo "Shutting down..."; kill $PROXY_PID 2>/dev/null; exit 0' INT

pnpm run dev

# If Vite exits, kill the proxy too
kill $PROXY_PID 2>/dev/null
