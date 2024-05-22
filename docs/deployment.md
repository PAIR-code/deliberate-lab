# Deployment

How to deploy this app to production.

Before deploying to production, make sure that you have:

- Updated the project ID in the [`.firebaserc`](./.firebaserc) file.
- Updated the Firebase app configuration in the [`webapp/src/lib/api/firebase-config.ts`](./webapp/src/lib/api/firebase-config.ts) file.
- Update the project ID, private key ID, private key, (client email, and client ID) in the [`scripts/service-account.json`](./scripts/service-account.json) file. You can generate a private key in the Firebase console under `Project settings` > `Service accounts`. The fields of the generated JSON file should be copied to the `service-account.json` file.

## Webapp

Build the webapp with the following command:

```bash
# Default build / test the image locally
ng build --configuration=production

# Serve the app from the /myapp prefix if you use a k8s cluster that shares the same domain for multiple services.
ng build --configuration=production --base-href /myapp/
```

A Dockerfile is provided in order to serve the webapp through a container.
You can build the docker image with the following command:

```bash
docker build -t webapp . -t myapp
```

Test the container locally with the following command:

```bash
docker run -p 4200:4200 myapp
```

## Firebase

First, make sure that you are logged in to your firebase account:

```bash
firebase login
```

Deploy the Firebase cloud functions, firestore rules and indexes with the following command:

```bash
firebase deploy
```

You can deploy only parts of the application with the following commands:

```bash
firebase deploy --only functions
firebase deploy --only firestore
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules
```

### About cloud functions

Firebase builds the cloud functions this way:

1. Locally compile the cloud functions to javascript with `tsc`.
2. Bundle the `functions` folder and send it to the cloud **without the `node_modules`**.
3. Install the `node_modules` on the cloud.

In order to make this work with our local `utils` package, we have an additional configuration that does the following:

1. When deploying cloud functions, run a predeploy script (configured in the [`firebase.json`](../firebase.json) file)
2. The [`predeploy.sh`](../functions/predeploy.sh) script runs `npm pack` in the `utils` folder to produce a `.tgz` archive, and then moves it over to the `functions` folder.
3. The `package.json` in the `functions` folder mentions `"file:./llm-mediation-experiments-utils-1.0.0.tgz"` as the source for the `@llm-mediation-experiments/utils` package.

Note that this still works in development mode without the `.tgz` archive thanks to the `paths` configuration in the [`tsconfig.json`](../functions/tsconfig.json) file.

Taken from https://github.com/firebase/firebase-tools/issues/968#issuecomment-460323113.

### Adding experimenters

Once your app is running in production, you may want to add experimenter accounts. To do so, follow these steps:

1. Have someone connect to the application using a Google-compatible account.
2. Run the following command in the `scripts` directory, after having set your own `service-account.json` credentials in it (see the [`service-account.example.json`](./scripts/service-account.example.json) file):

```bash
npm run set-experimenter <email> yes
```
