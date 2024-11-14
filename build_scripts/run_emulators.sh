#!/usr/bin/env bash

SCRIPT_DIR=$(dirname "$0")

cd "$SCRIPT_DIR"
cd ..

firebase emulators:start --import ./emulator_test_config