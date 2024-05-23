#!/bin/bash

# Pack the utils shared package and move it to the "functions" directory.
# This is necessary to ensure that the cloud functions deploy properly.

# The `firebase deploy --only functions` command builds the functions,
# zips the whole "functions" directory and sends it to the cloud.

# Navigate to the utils folder and pack it
cd ../functions

# Pack the utils package
npm pack ../utils

# Update the SHA of the utils package in the package-lock.json file
npm install @llm-mediation-experiments/utils

echo "Successfully packed the utils package in the cloud functions directory!"
