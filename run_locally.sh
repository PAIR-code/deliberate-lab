#!/bin/bash

# run_locally.sh
# Script to run Deliberate Lab locally following the developer guide.
# https://pair-code.github.io/deliberate-lab/developers/run-locally
#
# Assumes 'npm install' has been run in the root directory,
# and that 'firebase-tools' is installed globally or available in the path.
# 
# This script will kill any processes running on the ports used by the emulators.

# Exit immediately if a command exits with a non-zero status.
set -e

# Directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Check for required tools
if ! command -v npm &> /dev/null; then
    echo "Error: 'npm' command not found."
    exit 1
fi

if ! npx firebase --version &> /dev/null; then
    echo "Error: 'firebase' command not found. Please run 'npm install' first."
    exit 1
fi

echo "=== Checking configuration files ==="

# 1. Copy .firebaserc if not exists
if [ ! -f .firebaserc ]; then
    echo "Copying .firebaserc.example to .firebaserc"
    cp .firebaserc.example .firebaserc
else
    echo ".firebaserc already exists"
fi

# 2. Copy frontend/firebase_config.ts if not exists
if [ ! -f frontend/firebase_config.ts ]; then
    echo "Copying frontend/firebase_config.example.ts to frontend/firebase_config.ts"
    cp frontend/firebase_config.example.ts frontend/firebase_config.ts
else
    echo "frontend/firebase_config.ts already exists"
fi

# 3. Copy frontend/index.html if not exists
if [ ! -f frontend/index.html ]; then
    echo "Copying frontend/index.example.html to frontend/index.html"
    cp frontend/index.example.html frontend/index.html
    echo "NOTE: You may want to edit frontend/index.html to add your Google Analytics ID."
else
    echo "frontend/index.html already exists"
fi

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti tcp:$port)
    if [ -n "$pid" ]; then
        echo "Killing process $pid on port $port"
        kill -9 $pid
    fi
}

wait_for_port() {
    local port=$1
    local label=$2
    local timeout=120
    local counter=0
    echo "Waiting for $label (port $port) to be ready..."
    while ! nc -z 127.0.0.1 $port >/dev/null 2>&1; do
        sleep 1
        counter=$((counter+1))
        if [ $counter -ge $timeout ]; then
            echo "Timed out waiting for $label (port $port)"
            return 1
        fi
    done
    echo "$label (port $port) is ready."
}

echo "=== Cleaning up ports ==="
# Ports from firebase.json and webpack.config.ts
# 4000: Emulator UI
# 4201: Frontend
# 5001: Functions
# 8080: Firestore
# 9000: Database
# 9099: Auth
# 9199: Storage
PORTS=(4000 4201 5001 8080 9000 9099 9199)

for port in "${PORTS[@]}"; do
    kill_port $port
done

echo ""
echo "=== Building and Starting Services ==="

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    # Kill all child processes in the same process group
    trap - SIGINT SIGTERM # Clear the trap
    kill -- -$$ 2>/dev/null
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 1. Build utils (needed for backend and frontend)
echo "--- [1/4] Building utils ---"
cd utils
npm run build
# Start utils watcher in background
echo "Starting utils watcher..."
# Use tail -f /dev/null to keep stdin open, preventing premature exit
tail -f /dev/null | npm run build:watch &
UTILS_PID=$!
cd ..

# 2. Build functions (needed for backend)
echo "--- [2/4] Building functions ---"
cd functions
npm run build
# Start functions watcher in background
echo "Starting functions watcher..."
tail -f /dev/null | npm run build:watch &
FUNCTIONS_PID=$!
cd ..

# 3. Start Firebase emulators
echo "--- [3/4] Starting Firebase emulators ---"
# Using --import ./emulator_test_config as per instructions
tail -f /dev/null | npx firebase emulators:start --import ./emulator_test_config &
EMULATORS_PID=$!

# Wait for emulators to be ready
wait_for_port 8080 "Firestore"
wait_for_port 5001 "Functions"
wait_for_port 4000 "Emulator UI"

# 4. Start frontend web app
echo "--- [4/4] Starting frontend ---"
cd frontend
# npm run start includes 'npm run build' and 'npm run serve'
tail -f /dev/null | npm run start &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== All services started ==="
echo "Utils Watcher PID: $UTILS_PID"
echo "Functions Watcher PID: $FUNCTIONS_PID"
echo "Emulators PID: $EMULATORS_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Access the emulator suite at http://localhost:4000"
echo "Access the frontend app at http://localhost:4201"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for any process to exit
wait
