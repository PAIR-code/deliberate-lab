#!/bin/bash

# Pack the utils shared package and move it to the "functions" directory.
# This is necessary to ensure that the cloud functions deploy properly.

# The `firebase deploy --only functions` command builds the functions,
# zips the whole "functions" directory and sends it to the cloud.

# Navigate to the utils folder and pack it
cd ../utils
npm pack

# Move the packed file to the functions directory
mv llm-mediation-experiments-utils-*.tgz ../functions

echo "Successfully packed the utils package in the cloud functions directory!"
