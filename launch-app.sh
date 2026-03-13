#!/bin/bash
# Ultimate Tab Launch Script
# This ensures that both the Next.js dev server and the Tauri window are started correctly.

cd /home/user/Documents/UltimateTab-main

# Ensure port 3000 is clean before starting
echo "Checking for stale processes on port 3000..."
fuser -k 3000/tcp 2>/dev/null || true

# Clear .next cache if reopening after a potential crash
# rm -rf .next

echo "Starting Next.js server in background..."
npm run dev &

# Wait for Next.js to be ready (up to 30 seconds)
TIMEOUT=30
COUNTER=0
while ! curl -s http://localhost:3000 > /dev/null; do
    sleep 1
    COUNTER=$((COUNTER+1))
    if [ $COUNTER -ge $TIMEOUT ]; then
        echo "Timeout waiting for server"
        exit 1
    fi
done

# Run the Tauri app (discrete window)
# We run 'tauri dev' but Next is already running, so tauri dev will just connect
# Actually, running 'tauri dev' again might trigger 'beforeDevCommand'.
# Let's use 'cargo run' if server is up, or just 'tauri dev' and let it manage it?
# The user said it opens twice. Let's try to just run the binary if server is up.

cd src-tauri
cargo run --quiet --no-default-features
