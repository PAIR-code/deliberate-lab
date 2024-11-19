#!/bin/bash

# script to be executed inside the docker container
# in the future these will be incorporated to a docker file
# https://stackoverflow.com/questions/78232178/ollama-in-docker-pulls-models-via-interactive-shell-but-not-via-run-command-in-t

ollama serve &
ollama list
ollama pull nomic-embed-text