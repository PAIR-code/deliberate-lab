---
title: Deploying Deliberate Lab
layout: default
---

## Backend deployment

Set up a [Firebase project](https://firebase.google.com/)
with a Firestore database and "Sign in with Google" authentication.

Add your Firebase project ID to the `.firebaserc` file.

Then, using the [Firebase CLI](https://firebase.google.com/docs/cli/), run:

```bash
npx firebase login  # If not already logged in
npx firebase deploy
```

or use one of the following commands to only deploy part(s) of the backend:

```bash
npx firebase deploy --only functions
npx firebase deploy --only firestore
npx firebase deploy --only firestore:indexes
npx firebase deploy --only firestore:rules
```

See [Firebase documentation](https://firebase.google.com/docs/functions/get-started?gen=2nd#deploy-functions-to-a-production-environment)
for additional information.

### Allowlist setup

After initializing your Firebase's Firestore, create an `allowlist`
collection at the top level. For each user allowed researcher access
(e.g., can create and manage experiments) to your deployment, create
a document under `allowlist` with their email address as the document ID.

## Frontend deployment

If you haven't already, follow
[Firebase instructions](https://firebase.google.com/docs/web/setup#register-app)
to register your web app (under Project settings in the Firebase console).
This will generate a custom Firebase config
(including `apiKey`, `authDomain`, `projectId`, etc. fields).
Copy/paste this config into `frontend/firebase_config.ts` (which should be
forked from `frontend/firebase_config.example.ts`).

If you'd like to include Google Analytics, replace the placeholder
analytics ID in `index.html` (fork from `index.example.html` and see TODOs)
with your Google Analytics ID.

Tip: To locally run the frontend with the deployed Firebase backend,
navigate to the `frontend` directory and run `npm run start:prod`.

Finally, to build the frontend in the `frontend/dist` directory:

```bash
npm run build:prod
```

Then, deploy your build wherever you're hosting the platform
(e.g., App Engine)!

## Cache busting

When you build for prod, you will get bundled assets with a hash included in their filenames. This ensures that old code isn't loaded from the browser cache when new code is available, guarantees that users always get the most current version, and moves deployments closer to atomicity (so users can't get files from different deployments). To make proper use of that, you need to configure the cache-control headers in your hosting environment as follows:

- A long long max-age for javascript files (31536000 is good)
- No caching for `index.html`. This ensures that users will always get the most current deployed version of the code.

### Firebase hosting

If you're using Firebase Hosting, the following configuration works well (in `firebase.json`):

```json
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public,max-age=31536000,immutable"
          }
        ]
      },
      {
        "source": "/index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      }
    ]
  }
```
