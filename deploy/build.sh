#!/usr/bin/env bash

# Build must be separate from starting the frontend because
# build operations always go into a loop because of npm watch
# but starting the frontend requires that the build commands have run

# This is hacky, and requires unnecessary human input, but 
# works for now.

SCRIPT_DIR=$(dirname "$0")

bash "$SCRIPT_DIR/run_utils.sh" &
bash "$SCRIPT_DIR/run_functions.sh" &
bash "$SCRIPT_DIR/run_emulators.sh" &
wait