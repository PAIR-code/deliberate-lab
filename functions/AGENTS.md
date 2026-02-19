# AGENTS.md — `functions`

Firebase Cloud Functions backend: HTTP callable endpoints and Firestore
document triggers. All functions are registered in `src/index.ts`.

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
npx jest --testPathIgnorePatterns=<firestore_test_paths> -w functions
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
- The Express app setup is in `src/app.ts`
- The `src/dl_api/` directory contains the external REST API layer
