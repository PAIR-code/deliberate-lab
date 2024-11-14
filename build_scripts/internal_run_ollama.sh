#!/bin/bash

# script to be executed inside the docker container
# in the future these will be incorporated to a docker file
# https://stackoverflow.com/questions/78232178/ollama-in-docker-pulls-models-via-interactive-shell-but-not-via-run-command-in-t

echo "Starting Ollama server..."
ollama serve &


echo "Waiting for Ollama server to be active..."
while [ "$(ollama list | grep 'NAME')" == "" ]; do
  sleep 1
done


ollama pull llama3.2