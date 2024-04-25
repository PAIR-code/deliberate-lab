# LLM Mediation Experiments

<div>
  <img src="https://img.shields.io/badge/Node.js-v18-339933?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black"/>
  <img src="https://img.shields.io/badge/Angular-17-DD0031?style=for-the-badge&logo=angular&logoColor=white"/>
  <img src="https://img.shields.io/badge/prettier-1A2C34?style=for-the-badge&logo=prettier&logoColor=F7BA3E" />
  <img src="https://img.shields.io/badge/eslint-3A33D1?style=for-the-badge&logo=eslint&logoColor=white" />
</div>

This is a repository to support collaboration on using LLMs in behavioral economics experiments. e.g. library of relevant UI components and a library for calling LLMs.

[Instance deployed at EPFL](./EPFL.md)

## Project Structure

```bash
├── .vscode    # VSCode configuration
├── firestore  # Firebase Firestore rules
│
├── docs       # Documentation
│
├── firestore  # Firestore rules and indexes
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
└── webapp     # Webapp frontend source code
    ├── node_modules
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

### Emulators

In order to run offline and for development purposes, we use Java Firebase emulators.

```bash
export JAVA_TOOL_OPTIONS="-Xmx4g"  # Set your desired max RAM (here: 4GB)
firebase emulators:start  # Start the emulators
```

You will then be able to access the following UIs:

- Authentication UI: `http://localhost:4000/auth`
- Emulator UI: `http://localhost:4000`
- Firestore UI: `http://localhost:4000/firestore`
- Cloud Functions UI: `http://localhost:4000/functions`

### Firestore

We use Firestore as our database. The rules are located in the [`firestore.rules`](./firestore.rules) file.
Basically, the database cannot be externally accessed, and must be interacted with through cloud functions.

A database prototype schema can be found [here on dbdiagrams.io](https://dbdiagram.io/d/Firebase-LLM-Mediation-660d473a03593b6b61123f24) (readonly, change it with your own if you take-on the project).

You can seed the database with the default data by running the following command:

```bash
curl "http://127.0.0.1:5001/friendlychat-d6dc5/us-central1/seedDatabase?seeder_password=seeder_password"
```

This calls a cloud functions that adds to the database the default data. You may want to clear it first.

### Cloud Functions

We use Firebase Cloud Functions to run server-side code. The functions are located in the [`functions`](./functions) directory.

```bash
cd functions
cp .env.example .env  # Copy the example environment file
npm install  # Install the dependencies
npm run build:watch # Build the functions and watch for file changes for rebuilding
```

Upon running `npm run build`, if the emulator is running, it will automatically reload the functions.

### Authentication

This project sets up Firebase Authentication with email/password and Google sign-in.

#### Email - Password authentication

By default, experiment participants log in using their `uid`. It is passed to the Firebase Authentication service as `email:{uid}@palabrate` and `password:{uid}`.

#### Google sign-in

The Google sign-in is used for the administrators. They can log in using their Google account.

In order to create a dummy google account when running the project locally with emulators, follow these steps:

1. Launch the frontend and click on the Google sign-in button.
2. Create a new dummy profile.
3. Go to the Firebase Authentication UI and edit the created profile by adding `{"role": "experimenter"}` to the `Custom Claims` field. Add a dummy password, and save the profile.

You can now login as an experimenter using this profile.

### Quickstart

If you have everything installed, you can use the `restore terminals` extension in order to run all necessary commands at once (`ctrl + shift + P` > `Restore Terminals`).

## Webapp

The webapp is made using Angular JS 17.
Run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Recommended editor setup

This code is being developed using [Visual Studio Code](https://code.visualstudio.com/). Make sure to install the angular extension.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page. This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.7; it was then updated to Angular 17.

### Docker deployment

A Dockerfile is provided in order to serve the webapp through a container.

Build the webapp with the following command:

```bash
# Default build / test the image locally
ng build --configuration=production

# Serve the app from the /myapp prefix if you use a k8s cluster that shares the same domain for multiple services.
ng build --configuration=production --base-href /myapp/
```

You can then build the docker image with the following command:

```bash
docker build -t webapp . -t myapp
```

Test the container locally with the following command:

```bash
docker run -p 4200:4200 myapp
```
