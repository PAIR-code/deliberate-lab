#!/bin/bash

# run_locally.sh
# Script to run Deliberate Lab locally following the developer guide.
# https://pair-code.github.io/deliberate-lab/developers/run-locally
#
# This script will kill any processes running on the ports used by the emulators.

# Exit immediately if a command exits with a non-zero status.
set -e

# Suggest running doctor on unexpected errors
trap 'echo ""; echo "Something went wrong. Try running '\''npm run doctor'\'' to diagnose issues."' ERR

# Directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# --- Helper functions ---

# Install dependencies, with retry on failure
install_dependencies() {
    echo "Running npm ci..."
    if npm ci; then
        return 0
    fi

    echo ""
    echo "npm ci failed."
    read -p "Would you like to clean up and retry? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Cleaning up node_modules..."
        rm -rf node_modules frontend/node_modules functions/node_modules utils/node_modules
        npm cache clean --force
        echo ""
        echo "Retrying npm ci..."
        npm ci
    else
        exit 1
    fi
}

# Kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti tcp:$port)
    if [ -n "$pid" ]; then
        echo "Killing process $pid on port $port"
        kill -9 $pid
    fi
}

# Wait for a port to be ready
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

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    trap - SIGINT SIGTERM
    kill -- -$$ 2>/dev/null
    exit 0
}

# --- Pre-flight checks ---

echo "=== Checking prerequisites ==="

# Check for required tools
if ! command -v npm &> /dev/null; then
    echo "Error: 'npm' command not found."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo ""
    echo "Error: Node.js v22 or higher is required (found v$(node -v | cut -d'v' -f2))."
    echo ""
    echo "If using nvm, run:"
    echo "  nvm install 22"
    echo "  nvm use 22"
    echo ""
    exit 1
fi
echo "Node.js version: $(node -v)"

if [ ! -d "node_modules" ]; then
    echo ""
    echo "node_modules not found."
    read -p "Would you like to run 'npm ci' now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        install_dependencies
        echo ""
    else
        echo "Please run 'npm ci' from the repository root first."
        exit 1
    fi
fi

if ! npx firebase --version &> /dev/null; then
    echo "Error: 'firebase' command not found. Please run 'npm ci' first."
    exit 1
fi

# --- Configuration files ---

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

# --- Clean up ports ---

echo ""
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

# --- Start services ---

echo ""
echo "=== Building and Starting Services ==="

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
# Load test config with experimenter@ and not-experimenter@ profiles
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
