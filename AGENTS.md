# Deliberate Lab Developer Guide

This repository contains the code for Deliberate Lab, a platform for running deliberation experiments.
It is a monorepo with three main workspaces managed via NPM workspaces: `frontend`, `functions`, and `utils`.

## Project Structure & Workspaces

### `frontend/`
Web application built with [Lit](https://lit.dev/) and [MobX](https://mobx.js.org/).
- **src/components/**: UI components organized by feature (e.g., `experiment_builder`, `participant_view`).
- **src/services/**: State management and business logic services (Singleton pattern).
- **src/shared/**: Frontend-specific shared utilities and templates.
- **src/pair-components/**: Reusable generic UI components (buttons, textareas, etc.).

### `functions/`
Firebase Cloud Functions (backend) and Firestore triggers.
- **src/api/**: External API integrations (e.g., AI SDK).
- **src/dl_api/**: Deliberate Lab specific internal APIs.
- **src/stages/**: Backend logic for specific experiment stages (e.g., surveys, chat).
- **src/triggers/**: Firestore background triggers.
- **src/utils/**: Backend-specific utilities (auth, firestore helpers).

### `utils/`
Shared TypeScript code used by both frontend and functions.
- **src/types.ts**: Shared interfaces and types.
- **src/validation.ts**: Input validation schemas (TypeBox).
- **Note:** This package must be built (`npm run build -w utils`) for changes to be reflected in other workspaces.

## Development Workflow & Commands

### Setup & Dependencies
- **Install all dependencies:** `npm install` (from root)
- **Python Dependencies:** Requires `uv` for schema and type generation. Install via `curl -LsSf https://astral.sh/uv/install.sh | sh` or `brew install uv`.
- **Add dependency to workspace:** `npm install <pkg> -w <workspace>`
  - Example: `npm install lodash -w frontend`

### Build & Serve
- **Frontend:**
  - `npm run serve -w frontend` (Start dev server with HMR)
  - `npm run build -w frontend` (Build for production)
- **Functions:**
  - `npm run build -w functions` (Build with esbuild)
  - `npm run serve -w functions` (Start Firebase emulators for Functions & Firestore)
  - `npm run build:watch -w functions` (Watch mode for development)
- **Utils:**
  - `npm run build -w utils` (Build with tsup)
  - `npm run export-schemas` (Regenerate JSON schemas from types)
  - `npm run update-schemas` (Regenerate JSON schemas and Python types; requires `uv`)

### Linting & Formatting
- **Lint:** `npm run lint -w [workspace]` (Uses ESLint with flat config `eslint.config.mjs`)
- **Format:** Prettier is configured. Files are automatically formatted on commit via `lint-staged`.
- **Manual Fix:** `npm run lint -w [workspace] -- --fix`

### Testing
Tests use [Jest](https://jestjs.io/) with `ts-jest`.

- **Run all tests:** `npm run test -w [workspace]`
- **Run a single test file:**
  - **Frontend:** `npm run test -w frontend -- path/to/file.test.ts`
  - **Functions (Unit):** `npm run test:unit -w functions -- path/to/file.test.ts`
  - **Functions (Firestore/Integration):** `npm run test:firestore -w functions -- path/to/file.test.ts`
  - **Utils:** `npm run test -w utils -- path/to/file.test.ts`

### Diagnostics
- **Doctor Script:** `npm run doctor` (Checks environment setup, dependencies, and configuration)

## Code Style & Conventions

### General
- **File Naming:** Use `snake_case` for filenames (e.g., `experiment.endpoints.ts`, `gallery_card.ts`).
- **Class Naming:** Use `PascalCase` (e.g., `ExperimentService`, `GalleryCard`).
- **Variable/Method Naming:** Use `camelCase`.
- **Formatting:** 2 spaces indentation, semicolons, double quotes (Prettier defaults).
- **Imports:**
  - Group external imports first, then internal imports.
  - Use relative paths for internal imports within the same workspace.
  - Import shared code from `@deliberation-lab/utils`.

### Frontend (Lit + MobX)
- **Components:**
  - Extend `MobxLitElement` for reactive state support.
  - Decorators:
    - `@customElement('kebab-case-tag')`: Define component tag.
    - `@property({type: Object})`: Define reactive properties.
    - `@query('#id')`: Select DOM elements.
  - Styles: Import SCSS files: `import {styles} from './component.scss';`.
  - Templating: Use `html` tagged template literals. logic should be minimal in templates.
- **State Management:**
  - Create services extending the `Service` base class.
  - Access services via `core.getService(ServiceName)`.
  - Use MobX decorators: `@observable`, `@computed`, `@action`.
  - Initialize observability in constructor: `makeObservable(this);`.
  - Subscribe to Firestore data in `load()` or specific methods, store `Unsubscribe` functions.

### Functions (Firebase)
- **Endpoints:**
  - Use `onCall` from `firebase-functions/v2/https`.
  - **Validation:** ALWAYS validate `request.data` using `typebox` schemas (`Value.Check`).
  - **Auth:** Use `AuthGuard` helpers (e.g., `await AuthGuard.isExperimenter(request)`).
  - Return plain objects; errors should be thrown as `HttpsError`.
- **Triggers:**
  - Use `onDocumentCreated`, `onDocumentUpdated`, etc.
  - Ensure idempotency where possible.

### Data & Types
- **Shared Types:** Define types used by both frontend and backend in `utils/src`.
- **Validation Schemas:** Define `TypeBox` schemas in `utils` for runtime validation.
- **Firestore:** Use direct SDK calls (v9 modular SDK). Avoid ORMs.

## Error Handling
- **Frontend:**
  - Catch errors in services/components.
  - Display user-friendly error messages (toasts/banners).
  - Log details to console (`console.error`).
- **Backend:**
  - Throw `HttpsError` with appropriate code (`invalid-argument`, `not-found`, `permission-denied`, `internal`).
  - The client SDK automatically catches these and provides the error code/message.

## AI & LLM Integration
- **AI SDK:** The project uses Vercel's AI SDK (`ai`, `@ai-sdk/*`).
- **Providers:** Configured in `functions/src/api/ai-sdk.api.ts` (Google, Anthropic, OpenAI, Ollama).
- **Model Logs:** Log model inputs/outputs using `log.utils.ts` to Firestore for auditing.
