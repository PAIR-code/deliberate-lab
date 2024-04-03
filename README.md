# Llm Mediators

## Firebase

This project uses Firebase as its backend. The configuration can be found in the [`.firebaserc`](./.firebaserc) and [`firebase.json`](./firebase.json) files.

Install the firebase cli tools with the following commands:

```bash
npm install -g firebase-tools
firebase login  # Login to the Google account destined to manage the Firebase project
```

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

TODO: réorganiser ça. Mettre ce que je mets de base (+ des liens ?)
Parler de la config Firebase, comment installer et lancer ça.
