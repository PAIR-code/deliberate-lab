# AGENTS.md — `functions`

Firebase Cloud Functions backend (built with **esbuild**): HTTP callable
endpoints and Firestore document triggers. All functions are registered in
`src/index.ts`.

> See also: [root AGENTS.md](../AGENTS.md) for monorepo-wide conventions.

## Build & test

From the **repository root**:

```sh
npm run build -w functions    # Build with esbuild
npm test -w functions         # Run all tests (unit + emulator)
npm run typecheck -w functions
```

Emulator tests require **Java 21** for the Firebase emulator. The test
runner uses `firebase-test.json` (in the repo root) as the emulator config.

Unit-only tests (no emulator):

```sh
npm run test:unit -w functions
```

The integration test in `cohort_definitions.integration.test.ts` is large
and slow; it exercises full experiment lifecycle flows.

## File naming conventions

| Pattern | Purpose |
|---------|---------|
| `<entity>.endpoints.ts` | HTTP callable functions (registered in `src/index.ts`) |
| `<entity>.utils.ts` | Business logic and helpers |
| `<entity>.utils.test.ts` | Unit tests for business logic |

### Stage-specific files (`src/stages/`)

Stage backend logic lives in `src/stages/` and follows these patterns:

| Pattern | Purpose |
|---------|---------|
| `<stage_type>.endpoints.ts` | Callable endpoints for the stage |
| `<stage_type>.utils.ts` | Stage-specific business logic |
| `<stage_type>.utils.test.ts` | Tests |

New stage endpoints must be exported from `src/index.ts`.

## Source directory overview

| Directory | Purpose |
|-----------|---------|
| `src/stages/` | Stage-specific backend logic |
| `src/triggers/` | Firestore document triggers (see `src/triggers/README.md`) |
| `src/chat/` | Chat-specific utilities |
| `src/dl_api/` | External REST API layer (see below) |
| `src/api/` | Internal API utilities (LLM provider integrations) |
| `src/utils/` | Shared backend helper functions |

### Key files

| File | Role |
|------|---------|
| `src/index.ts` | Registers all Cloud Functions (callables + triggers) |
| `src/app.ts` | Initializes `StageManager` — maps stage types to handlers |
| `src/data.ts` | Firestore data access layer (reads/exports) |
| `src/participant.utils.ts` | Participant lifecycle — stage progression, transfers, cohort assignment (~1400 lines, the largest and most complex backend file) |

## Trigger system

Firestore document triggers live in `src/triggers/`. See
`src/triggers/README.md` for the full list of triggers and the Firestore
document paths they listen on.

Key trigger files:

| File | Listens to |
|------|-----------|
| `participant.triggers.ts` | Participant document create/update |
| `stage.triggers.ts` | Participant stage data and public stage data updates |
| `chat.triggers.ts` | Public and private chat message creation |
| `chip.triggers.ts` | Chip transaction creation |
| `agent_participant.triggers.ts` | Agent participant lifecycle events |
| `presence.triggers.ts` | Realtime Database presence changes |

## Agent (LLM) participants

- `agent.utils.ts` — core agent orchestration logic
- `agent_participant.utils.ts` — manages how LLM agents participate in
  experiments (stage completion, API calls, answer extraction)
- `structured_prompt.utils.ts` — prompt construction for agent participants
  and mediators

## Data access

`src/data.ts` is the Firestore data access layer. It provides functions
like `getExperimentDownload` and `getExperimentLogs` using the Firebase
Admin SDK. **Do not write raw Firestore calls in endpoint files** — use or
extend the data access layer instead.

## Endpoint conventions

- Endpoints are defined in `*.endpoints.ts` files and exported from
  `src/index.ts`
- Each endpoint returns structured responses
- `src/app.ts` initializes the `StageManager` (from `utils`) which maps
  stage types to their handler logic
- The `src/dl_api/` directory contains the external REST API layer
  (key-authenticated HTTP endpoints for programmatic access)

### REST API structure (`src/dl_api/`)

The REST API is an Express app exposed as a single Cloud Function. It
uses API key authentication (not Firebase Auth) for server-to-server
access.

| File | Purpose |
|------|---------|
| `dl_api.endpoints.ts` | Express app setup, middleware, route registration |
| `experiments.dl_api.ts` | `/v1/experiments/` route handlers |
| `cohorts.dl_api.ts` | `/v1/experiments/:id/cohorts/` route handlers |
| `dl_api.utils.ts` | Auth middleware and request validation |
| `dl_api_key.utils.ts` | API key creation, verification, and revocation |
| `dl_api.test.utils.ts` | Shared test setup utilities |

## How to add a new REST API endpoint

Adding a REST API endpoint touches multiple files across workspaces:

1. **Implement the route handler** — add a function in the appropriate
   `*.dl_api.ts` file (or create a new one for a new resource type)
2. **Register the route** — add the Express route in
   `dl_api.endpoints.ts`
3. **Update the OpenAPI spec** — add the endpoint to
   `docs/assets/api/openapi.yaml`
4. **Add a Python client method** — update
   `scripts/deliberate_lab/client.py` so the SDK exposes the new endpoint
5. **Write integration tests** — add tests in
   `*.dl_api.integration.test.ts`

> [!NOTE]
> REST API endpoints (`/v1/...`) use API key auth and are for
> server-to-server use. **Frontend callables** (used by the web app) are
> separate — they are Firebase `onCall` functions registered in
> `src/index.ts` with corresponding wrappers in
> `frontend/src/shared/callables.ts`.

## Common pitfalls

1. **Writing raw Firestore calls in endpoint files** — use or extend the
   data access layer in `src/data.ts` instead.
2. **Forgetting to export new endpoints from `src/index.ts`** — Cloud
   Functions will silently ignore unregistered functions.
3. **Missing Java 21 for emulator tests** — use `npm run test:unit -w
   functions` to run unit tests without the emulator.
4. **Firestore race conditions** — concurrent writes to the same document
   (e.g., multiple participants updating public stage data simultaneously)
   are a recurring source of bugs. Use Firestore **transactions** for
   read-modify-write operations on shared documents.
