# Llm Mediators

<img src="https://img.shields.io/badge/Node.js-v18-339933?style=for-the-badge&logo=node.js" />
<img src="https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black"/>
<img src="https://img.shields.io/badge/Angular-17-DD0031?style=for-the-badge&logo=angular&logoColor=white"/>
<img src="https://img.shields.io/badge/prettier-1A2C34?style=for-the-badge&logo=prettier&logoColor=F7BA3E" />
<img src="https://img.shields.io/badge/eslint-3A33D1?style=for-the-badge&logo=eslint&logoColor=white" />

## Project Structure

```bash
├── .vscode    # VSCode configuration
├── firestore  # Firebase Firestore rules
│
├── functions  # Firebase Cloud Functions
│   ├── lib           # Build output
│   ├── node_modules
│   └── src           # Cloud functions source code
│       ├── endpoints   # Cloud functions endpoints
│       ├── seeders     # Model factories
│       ├── utils       # Utilities
│       ├── validation  # TypeBox validation utilities
│       ├── app.ts      # Firebase app initialization
│       └── index.ts    # Cloud functions entrypoint
│
├── node_modules
│
└── src               # Frontend source code
    ├── app           # Angular JS 17 app & components
    ├── assets        # Static assets
    ├── environments  # Environment configuration
    └── lib           # API, types & utilities
```

## Firebase

This project uses Firebase as its backend. The configuration can be found in the [`.firebaserc`](./.firebaserc) and [`firebase.json`](./firebase.json) files.

Install the firebase cli tools with the following commands:

```bash
npm install -g firebase-tools
firebase login  # Login to the Google account destined to manage the Firebase project
```

### Firestore

We use Firestore as our database. The rules are located in the [`firestore.rules`](./firestore.rules) file.
Basically, the database cannot be externally accessed, and must be interacted with through cloud functions.

A database prototype schema can be found [here on dbdiagrams.io](https://dbdiagram.io/d/Firebase-LLM-Mediation-660d473a03593b6b61123f24) (readonly, change it with your own if you take-on the project).

You can seed the database with the default data by running the following command:

```bash
curl http://127.0.0.1:5001/llm-mediator-political/us-central1/seedDatabase
```

This calls a cloud functions that adds to the database the default data. You may want to clear it first.

### Cloud Functions

We use Firebase Cloud Functions to run server-side code. The functions are located in the [`functions`](./functions) directory.

```bash
cd functions
npm install  # Install the dependencies
npm run watch-functions  # Build the functions and watch for file changes for rebuilding
```

Upon running `npm run build`, if the emulator is running, it will automatically reload the functions.

### Emulators

In order to run offline and for development purposes, we use Java Firebase emulators.

```bash
export JAVA_TOOL_OPTIONS="-Xmx4g"  # Set your desired max RAM (here: 4GB)
firebase emulators:start  # Start the emulators
```

You will then be able to access the following UIs:

- Emulator UI: `http://localhost:4000`
- Firestore UI: `http://localhost:4000/firestore`
- Cloud Functions UI: `http://localhost:4000/functions`

### Quickstart

If you have everything installed, you can use the `restore terminals` extension in order to run all necessary commands at once (`ctrl + shift + P` > `Restore Terminals`).

## Development server

Run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Recommended editor setup

This code is being developed using [Visual Studio Code](https://code.visualstudio.com/). Make sure to install the angular extension.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `npm run test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page. This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.7; it was then updated to Angular 17.
