# Deploying from local

`npm run deploy:*` is the **local companion to `cloudbuild.yaml`**. It reproduces CI's staged, ordered deploy — validate → build → test → rules → indexes → functions → frontend — from your machine, for when you have locally-developed, bespoke code you just want to deploy *somewhere* others can reach.

> [!CAUTION]
> These commands deploy to a **real GCP project**. They are real-by-default. Always preview with `DRY_RUN=1` first, and double-check `PROJECT_ID`.

## Prerequisites

The tooling assumes the target project is already provisioned (APIs enabled, App Engine app created, Firebase web app created). It does **not** create resources or manage secrets. You must be logged in locally:

```sh
npm ci                 # installs firebase-tools (used via npx)
firebase login         # for firebase deploy / apps:sdkconfig
gcloud auth login      # for App Engine deploy (frontend surface only)
```

Node ≥22 is required. `deploy:functions` builds functions via Firebase `predeploy` hooks (lint + build); a Java 21 runtime is **not** needed for deploys (only for `functions` tests).

## Configuration (environment variables)

npm forwards `-- <args>` only to the last command in a chain, so cross-cutting options are **environment variables** (they propagate to every child process).

| Env var | Meaning | Default |
|---|---|---|
| `PROJECT_ID` | **Required.** Target GCP project. No fallback to `.firebaserc`/`gcloud config`. | — |
| `DRY_RUN` | If set, run dry-run equivalents (`firebase … --dry-run`, `gcloud app describe`). | unset (real) |
| `YES` | If set, skip the typed confirmation. | unset (prompt) |
| `AUTO_PROMOTE` | Frontend: migrate traffic to the new version (drops `--no-promote`). | unset |
| `FIREBASE_CONFIG_FILE` | Path to a JSON web-config override file. | auto-fetch |

## Usage

```sh
# Preview the whole pipeline (no writes to GCP)
PROJECT_ID=my-proj DRY_RUN=1 npm run deploy:all

# Full deploy (single confirmation prompt up front)
PROJECT_ID=my-proj npm run deploy:all

# One surface, no prompt
PROJECT_ID=my-proj YES=1 npm run deploy:functions
```

Individual surfaces are independently runnable:

| Script | Deploys |
|---|---|
| `deploy:rules` | Firestore → Storage → Database rules |
| `deploy:rules:firestore` / `:storage` / `:database` | a single ruleset |
| `deploy:indexes` | Firestore composite indexes |
| `deploy:functions` | Cloud Functions (predeploy: lint + build) |
| `deploy:frontend` | Production frontend → App Engine |
| `deploy:all` | the full ordered pipeline |

Supporting build/validate scripts (also used by `deploy:all`): `build`, `build:utils|functions|frontend`, `lint`, `test`.

## Safety model

1. **Explicit target** — `PROJECT_ID` is required every time; the tooling never guesses (avoids "oops, deployed to prod").
2. **Typed confirmation** — each real deploy asks you to type the project id.  `YES=1` skips it (`deploy:all` confirms once, then sets `YES=1` for children).  `DRY_RUN=1` needs no confirmation.
3. **Rollback** — this tooling takes **no local backups**.  To revert: Firebase retains **rules** version history (restore via the console); **indexes** change rarely and prior definitions live in git (`firestore/indexes.json`); for any surface, redeploy from an earlier commit. Progress prints to the terminal only — redirect if you want a transcript: `npm run deploy:all > deploy.log 2>&1`.

## Frontend web config resolution

The Firebase web config is **not a secret** (it ships in the client bundle; security is enforced by Rules + App Check), but it **must be correct** for the target project. It is produced authoritatively from, in precedence:

1. `FIREBASE_CONFIG_FILE` — a JSON file containing the `FirebaseOptions` object.
2. Auto-fetch — `firebase apps:sdkconfig WEB --project $PROJECT_ID`.

The resolved config is then **validated** (mirroring CI: `apiKey`, `appId`, `authDomain`, `measurementId`, `messagingSenderId`, `projectId`, `storageBucket` must all be present as strings, and `projectId` must equal `PROJECT_ID`). `measurementId` comes from a linked Google Analytics stream — if auto-fetch omits it, link GA to the web app or supply a complete `FIREBASE_CONFIG_FILE`.

It is **reconciled** against any existing `frontend/firebase_config.ts`:

| Existing file | Action |
|---|---|
| missing | written from the authoritative config |
| matches the authoritative config | left as-is |
| the dev demo placeholder (copy of `firebase_config.example.ts` the dev `build` creates) | replaced |
| **a different real config** | **hard failure** — the file is gitignored and may be intentional, so it is never silently overwritten. Delete it (to regenerate) or correct it to match, then re-run. |

For `deploy:all` this validation + conflict check runs as an **early preflight** (before lint/build/test) so a bad or conflicting config blocks in seconds rather than after minutes of work. On a real deploy the config is then written, `measurementId` is passed to Webpack via `MEASUREMENT_ID`, `index.example.html` is copied to `index.html`, and the bundle is built with `npm run build:prod -w frontend` before `gcloud app deploy`. `DRY_RUN=1` validates/reconciles (including auto-fetch and the conflict check) but does **not** write files or build.

## Relationship to CI

CI (`cloudbuild.yaml`) remains the canonical path for the production project.  This local path favors simplicity over speed (local deploys are rare): it keeps `firebase.json`'s `predeploy` hooks instead of stripping them into a `firebase-prod.json`, so functions are linted/built at deploy time.
