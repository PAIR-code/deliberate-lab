#!/usr/bin/env bash

SCRIPT_DIR=$(dirname "$0")

cd "$SCRIPT_DIR"
cd ..
cd functions

npm install
npm run build:watch