#!/usr/bin/env bash

SCRIPT_DIR=$(dirname "$0")

cd "$SCRIPT_DIR"
cd ..
cd frontend
npm install
npm run start