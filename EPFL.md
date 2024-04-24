# EPFL

An instance of this app is deployed at EPFL under the name Palabrate.

Webapp url: https://modemos.epfl.ch/palabrate

## Deploy Firebase

You must have logged in to the Firebase CLI with the account that has access to this project using the command `firebase login`.

```bash
firebase deploy  # Deploys everything (Cloud Functions, Firestore rules)
firebase deploy --only functions  # Deploys only Cloud Functions
```

You can then access various consoles at the following URLs:

| Console                 | URL                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Project Console         | https://console.firebase.google.com/u/0/project/friendlychat-d6dc5/overview                               |
| Firestore Console       | https://console.firebase.google.com/u/0/project/friendlychat-d6dc5/firestore/databases/-default-/data/~2F |
| Cloud Functions Console | https://console.firebase.google.com/u/0/project/friendlychat-d6dc5/functions                              |
| Authentication Console  | https://console.firebase.google.com/u/0/project/friendlychat-d6dc5/authentication/users                   |

Note that you can also access the cloud functions through the Google Cloud console, with more options available:
https://console.cloud.google.com/run/detail/us-central1/seeddatabase/security?project=friendlychat-d6dc5

### Database Seeding

For staging purposes, you can still seed the database in production. This can be done safely in 3 steps:

1. Remove authentication on the `seedDatabase` function in the [Google Cloud console](https://console.cloud.google.com/run/detail/us-central1/seeddatabase/security?project=friendlychat-d6dc5&authuser=4) with an owner account.
2. Call the `seedDatabase` function with the correct password: `curl "https://seeddatabase-6pznbjf6rq-uc.a.run.app?seeder_password=seeder_password_here"`
3. Re-enable authentication on the `seedDatabase` function in the [Google Cloud console](https://console.cloud.google.com/run/detail/us-central1/seeddatabase/security?project=friendlychat-d6dc5&authuser=4) with an owner account.

## Deploy the Webapp

Coming soon...
