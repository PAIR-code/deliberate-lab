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

#### Adding experimenters

Once your app is running in production, you may want to add experimenter accounts. To do so, follow these steps:

1. Have someone connect to the application using a Google-compatible account.
2. Run the following command in the `scripts` directory, after having set your own `service-account.json` credentials in it (see the [`service-account.example.json`](./scripts/service-account.example.json) file):

```bash
npm run set-experimenter <email> yes
```
