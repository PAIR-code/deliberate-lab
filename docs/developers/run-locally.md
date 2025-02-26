---
title: Run Deliberate Lab locally
layout: default
---

> Interested in contributing to Deliberate Lab?
[Check out starter bugs](https://github.com/PAIR-code/deliberate-lab/issues?q=is%3Aissue+is%3Aopen+label%3A%22starter+bug%22)

To start running Deliberate Lab locally,
[clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
the [PAIR-code/deliberate-lab](https://github.com/PAIR-code/deliberate-lab)
repository:

```bash
# Using HTTPS:
https://github.com/PAIR-code/deliberate-lab.git

# Using SSH key:
git@github.com:PAIR-code/deliberate-lab.git
```

## Repository overview

The Deliberate Lab repository contains the following subdirectories:

- Firebase backend
  - `firestore`: [Firebase security rules](https://firebase.google.com/docs/rules/rules-language) for the Firebase backend
  - `functions`: [Cloud functions](https://firebase.google.com/docs/functions) for the Firebase backend
- Lit/MobX frontend
  - `frontend`: Frontend web app written in Lit and MobX
- Helpers
  - `utils`: Package (`@deliberation-lab/utils`) with types (e.g., `Experiment`) that are shared across the frontend and backend
  - `emulator_test_config`: Firebase backend emulators if running the platform locally (without Firebase connection)

## Building, running, and developing locally

In order to run the platform locally (using the Firebase emulators
instead of a Firebase project for the backend):

### 1. Build utils (needed for backend and frontend)

NOTE: The `utils` directory builds as the package `@deliberation-lab/utils`,
which can then be used in `/functions` and `/frontend`.

```bash
cd utils  # If navigating from top level
npm install  # Run this command only once

npm run build:watch  # Build and listen to changes
```

The shared utilities are built using [`tsup`](https://tsup.egoist.dev) to
produce both esm and cjs (for the cloud functions) code.

> **Troubleshooting:** To manually export the utils package, use `npm pack`
to generate `deliberation-lab-utils-1.0.0.tgz`. Then, copy this into
the directory that requires the utils (e.g., `frontend` or `functions`).

### 2. Build functions (needed for backend)

```bash
cd functions  # If navigating from top level
npm install  # Run this command only once

npm run build:watch  # Build and listen to changes
```

### 3. Start Firebase emulators (used as backend)

If you haven't already, copy examples to create local configuration files:
```bash
# Defines the Firebase project ID
# (can leave example placeholders in while running emulators)
cp .firebaserc.example .firebaserc

# Defines the Firebase project web API key
# (can leave example placeholders in while running emulators)
cp frontend/firebase_config.example.ts frontend/firebase_config.ts
```

> [Use this manual for creating and using a Firebase API key](https://firebase.google.com/docs/projects/api-keys#test-vs-prod-keys). Once the key is created, there should be a generated JSON configuration object in your Firebase project's settings page under the "General" tab. Then copy paste the contents of the JSON object to `frontend/firebase_config.ts`.

Next, make sure you have [Firebase CLI](https://firebase.google.com/docs/cli/) set up:
```bash
npm install -g firebase-tools
firebase login
```

Finally, to run the emulators:
```bash
# Start the emulators and load the `emulator_test_config` settings
firebase emulators:start --import ./emulator_test_config
```

> Note: The emulator test config sets up two profiles (experimenter@
and not-experimenter@) for login *and* adds the experimenter@ profile to
the Firestore "allowlist" collection (which enables that profile to
create, view, etc. experiments).

Then, access the emulator suite (e.g., auth, Firestore) at
http://localhost:4000.

### 4. Start frontend web app

```bash
cd frontend  # If navigating from top level
npm install  # Only run once

# Create an index.html file and (optionally) replace the placeholder
# analytics ID (see TODOs in example file) with your Google Analytics ID
cp index.example.html index.html

# If you didn't already create a firebase_config.ts when setting up
# the emulator, do so now:
#
# cp firebase_config.example.ts firebase_config.ts

npm run start
```

Then, view the app at http://localhost:4201.

## Troubleshooting tips

### Getting and using your Google Analytics ID
* If you already own a Google Analytics ID, you can [find it via these instructions](https://support.google.com/analytics/answer/9539598?hl=en). 

* If you don't, you can [register one here](https://analytics.google.com/analytics/web/#/a334209184p464501091/admin/account/create?utm_source=gahc&utm_medium=dlinks) ([see instructions](https://support.google.com/analytics/answer/9304153#stream)). At the end of the registration process ("Data Collection"), you will be asked to specify a platform. Select "Web" and (since this is a local project) input **localhost.local** as the URL.

* After obtaining the Analytics ID (the ID starting with "*G-*") follow the instructions above. Keep in mind that when including it in JavaScript code, it needs to be a string (e.g. `gtag('config', 'G-xxxxx')`), while in URLs it must remain without quotes (e.g. `gaScript.src=https://www.googletagmanager.com/gtag/js?id=G-xxxxxxxx`)

## Formatting
We now have a pre-commit hook that automatically runs Prettier (see configuration at `./.prettierrc.json`) and ESLint (see configuration at `./eslint.config.mjs`). This is set up with `lint-staged` under the root directory's `./package.json`.

You can also run Prettier and/or ESLint from the command line, e.g.:

```bash
npx prettier --write --list-different "**/*.ts" # runs on all TypeScript files
npx eslint "**/*.ts" # runs on all TypeScript files
```