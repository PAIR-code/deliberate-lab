# Getting Started

This project has x different entities :

- shared utilities package
- web application
- firebase emulators (emulate firestore, firebase authentication, cloud functions)
- cloud functions
- utility scripts

This document will guide you through setting up the project for development.

## Shared Utilities

To build the shared utilities and watch for changes, run the following command:

```bash
cd utils
npm install  # Run this command only once
npm run build:watch
```

The shared utilities are built using [`tsup`](https://tsup.egoist.dev) to produce both esm and cjs (for the cloud functions and scripts) code.

## Frontend

#### Development server

First, install the dependencies:

```bash
cd lit
npm install
```

Then, set up Firebase and LLM config (fork the example and fill in details):

```bash
cp src/shared/config_example.ts src/shared/config.ts
```

Finally, run the app (with live reload):

```bash
npm run start
```

View the app at [`http://localhost:4201/`](http://localhost:4201/).

(There is also a deprecated version of the frontend in `webapp/`,
written in Angular.)

## Firebase

This project uses Firebase as its backend. The configuration can be found in the [`.firebaserc`](./.firebaserc) and [`firebase.json`](./firebase.json) files.

Install the firebase cli tools with the following commands:

```bash
npm install -g firebase-tools
firebase login  # Login to an account that has admin rights for the Firebase project
```

### Configuration

From the root directory (`llm-mediation-app/`), create the configuration files for a default firebase project:

```bash
cp .firebaserc.example .firebaserc
cp webapp/src/lib/api/firebase-config.example.ts webapp/src/lib/api/firebase-config.ts
cp scripts/service-account.example.json scripts/service-account.json
```

This should be enough for local development with emulators.

### Emulators

In order to run offline and for development purposes, we use Java Firebase emulators.

```bash
firebase emulators:start --import ./emulator_test_config  # Start the emulators and load the default Authentication configuration
```

You will then be able to access the following UIs:

- Authentication UI: `http://localhost:4000/auth`
- Emulator UI: `http://localhost:4000`
- Firestore UI: `http://localhost:4000/firestore`
- Cloud Functions UI: `http://localhost:4000/functions`

### Firestore

We use Firestore as our database. The rules are located in the [`firestore.rules`](./firestore.rules) file.
Basically, the database cannot be externally accessed, and must be interacted with through cloud functions.

A database prototype schema can be found [here on dbdiagrams.io](https://dbdiagram.io/d/Firebase-LLM-Mediation-660d473a03593b6b61123f24) (readonly, change it with your own if you take over the project).

You can seed the database with the default data by running the following command:

```bash
cd scripts
npm install  # Run this command only once
npm run seed-db
```

### Cloud Functions

We use Firebase Cloud Functions to run server-side code. The functions are located in the [`functions`](./functions) directory.

```bash
cd functions
../functions/predeploy.sh # Run this command only once
npm install  # Run this command only once
npm run build:watch # Build the functions and watch for file changes for rebuilding
```

Upon running `npm run build`, if the emulator is running, it will automatically reload the functions.

### Authentication

This project sets up Firebase Authentication with Google sign-in.
Note that participants are not tracked by Firebase Authentication. Their UID work as a unique identifier, nothing else is stored.

Experimenters can log in using Google-compatible accounts. There are 2 default accounts in the emulator configuration:

- experimenter@google.com
- not-experimenter@google.com

When you click on the "Sign in with Google", you will see both of them and be able to choose which one you can to log in with.
