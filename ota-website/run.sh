#!/bin/bash
# Start OTA Website services

cd "$(dirname "$0")"

# Start proxy server
node proxy-server.js &
echo $! > /tmp/proxy.pid

# Wait for proxy
sleep 2

# Start Vite
pnpm run dev
