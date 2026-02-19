# AGENTS.md — Deliberate Lab (root)

Deliberate Lab is a platform for running online research experiments on
human + LLM group dynamics. This file orients AI coding assistants to the
monorepo structure, conventions, and workflows.

## Keeping AGENTS.md in sync

These `AGENTS.md` files document conventions that should be followed by
default. If a user request conflicts with the guidance here, **raise the
concern** — ask which takes precedence (their idea or the documented
convention) before proceeding. Whichever direction is chosen, update the
relevant `AGENTS.md` file(s) to match so documentation and code stay in
sync.

## Architecture

This is an npm workspaces monorepo with three packages:

| Workspace | Path | Purpose |
|-----------|------|---------|
| `@deliberation-lab/utils` | `utils/` | Shared TypeScript types, validation, and utilities |
| `functions` | `functions/` | Firebase Cloud Functions (HTTP endpoints + Firestore triggers) |
| `deliberate-lab` | `frontend/` | Lit Element + MobX single-page app (Webpack) |

Other top-level directories:

- `firestore/` — Firestore security rules, database rules, and indexes
- `docs/` — Jekyll documentation site (GitHub Pages)
- `scripts/` — pip-installable Python API client (`deliberate_lab`) with auto-generated Pydantic types + a Node.js doctor script (see `scripts/AGENTS.md`)
- `emulator_test_config/` — Static config for Firebase emulator imports

### Dependency graph

```
utils ──► frontend
  │
  └────► functions
```

`utils` is a shared library consumed by both `frontend` and `functions`.
**Always build `utils` first** — the other two workspaces depend on it.

## Getting started

- **Node ≥22** is required (see `.nvmrc`)
- Install all dependencies from the repo root: `npm ci`
- Run everything locally: `./run_locally.sh`

> [!IMPORTANT]
> Always run npm commands from the **repository root** using the `--workspace`
> (or `-w`) flag. Do **not** `cd` into subdirectories.
>
> ```sh
> npm run build -w utils
> npm test -w functions
> npm run start -w frontend
> ```
>
> This matches the convention used in `cloudbuild.yaml` and ensures
> consistent dependency resolution via npm workspaces.

## Linting & formatting

- **Prettier** formats `.json`, `.ts`, `.html`, `.scss`, and `.css` files
- **ESLint** with `@typescript-eslint`; `@typescript-eslint/no-explicit-any`
  is set to `error` — do not use `any`
- **Husky** + **lint-staged** runs Prettier and ESLint on pre-commit
- Frontend files get browser globals; everything else gets Node globals

## CI

`cloudbuild.yaml` drives all builds. The `_DEPLOYMENT_TYPE` substitution
variable controls which steps run:

| Value | What it does |
|-------|-------------|
| `test` | Lint, format check, and unit tests for all workspaces (no deploy) |
| `functions` | Build + deploy Cloud Functions |
| `frontend` | Build + deploy frontend to App Engine |
| `rules` | Deploy Firestore security rules |
| `indexes` | Deploy Firestore indexes |
| `all` | All of the above |

GitHub Actions (`.github/workflows/ci.yaml`) also runs a **schema sync
check**: if types in `utils` change, `docs/assets/api/schemas.json` and
`scripts/deliberate_lab/types.py` must be regenerated or CI will fail.
Run `npm run update-schemas` from the repo root to fix this.

## Testing

Each workspace has its own `npm test`:

```sh
npm test -w utils       # Jest; unit tests colocated with source
npm test -w functions   # Jest; requires Java 21 for Firebase emulator
npm test -w frontend    # Jest
```

Functions tests run against the Firebase emulator using
`firebase-test.json`. The integration test in
`cohort_definitions.integration.test.ts` is large and slow.

## Firebase config

| File | Purpose |
|------|---------|
| `firebase.json` | Local dev emulator config |
| `firebase-test.json` | Emulator config for CI / test runs |
| `.firebaserc.example` | Template for project aliases (copy to `.firebaserc`) |
| `firestore/firestore.rules` | Firestore security rules |
| `firestore/database.rules.json` | Realtime Database rules |
| `firestore/storage.rules` | Cloud Storage rules |
| `firestore/indexes.json` | Firestore composite indexes |

## Stage system

Experiments are composed of ordered **stages** (chat, survey, chip
negotiation, ranking, etc.). The `StageKind` enum in
`utils/src/stages/stage.ts` lists all stage types.

Adding a new stage type touches **all three workspaces**:

1. **`utils/src/stages/`** — types, validation, manager, prompts
2. **`functions/src/stages/`** — backend endpoint + trigger logic
3. **`frontend/src/components/stages/`** — config, preview, and answer UI components

See each workspace's `AGENTS.md` for detailed guidance.
