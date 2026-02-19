# AGENTS.md — `frontend`

Lit Element + MobX single-page application built with Webpack.
See also `frontend/README.md` for additional context on routing,
Firebase setup, and experiment configuration.

## Build & test

From the **repository root**:

```sh
npm run start -w frontend     # Build + serve (dev, localhost:4201)
npm run build -w frontend     # Dev build only
npm run build:prod -w frontend  # Production build
npm test -w frontend          # Run Jest tests
```

For local dev, copy config files first (or use `run_locally.sh` which
handles this automatically):

```sh
cp frontend/firebase_config.example.ts frontend/firebase_config.ts
cp frontend/index.example.html frontend/index.html
```

## Component architecture

### `src/components/` — Feature components

Organized into 17 subdirectories by feature area:

| Directory | Purpose |
|-----------|---------|
| `stages/` | Stage config, preview, and answer components (~87 files) |
| `experiment_builder/` | Experiment creation/editing UI |
| `experiment_dashboard/` | Experiment monitoring dashboard |
| `experimenter/` | Experimenter-facing views |
| `participant_view/` | Participant-facing experiment UI |
| `chat/` | Chat interface components |
| `header/` | App header (includes routing logic) |
| `sidenav/` | Side navigation (includes routing logic) |
| `login/` | Authentication UI |
| `settings/` | App settings |
| `gallery/` | Experiment gallery/templates |
| `progress/` | Progress indicators |
| `popup/` | Modal/popup components |
| `participant_profile/` | Participant profile display |
| `avatar_picker/` | Avatar selection UI |
| `admin/` | Admin panel |
| `shared/` | Shared component utilities |

### `src/pair-components/` — Reusable primitives

Standalone UI primitives: `button`, `icon`, `icon_button`, `textarea`,
`textarea_template`, `tooltip`, `menu`, `info_popup`. These are
general-purpose and not tied to project state.

`shared.css` in this directory provides base styles used across primitives.

## Service layer

MobX-based services in `src/services/`:

| Service | Role |
|---------|------|
| `firebase.service.ts` | Firebase connection (Firestore, Auth) |
| `auth.service.ts` | Authentication and login state |
| `experiment.manager.ts` | Experiment data management (largest service) |
| `experiment.editor.ts` | Experiment editing state |
| `experiment.service.ts` | Current experiment subscription |
| `participant.service.ts` | Participant state and stage progress |
| `participant.answer.ts` | Participant answer management |
| `cohort.service.ts` | Cohort management |
| `router.service.ts` | App routing and page definitions |
| `home.service.ts` | Home page experiment list |
| `settings.service.ts` | App settings |
| `admin.service.ts` | Admin operations |
| `analytics.service.ts` | Google Analytics |
| `presence.service.ts` | Participant online/offline presence |

## Stage components

Stage UI components live in `src/components/stages/`. Each stage type
typically has three components:

| Pattern | Purpose |
|---------|---------|
| `<stage_type>_config.ts` | Experimenter-facing configuration editor |
| `<stage_type>_preview.ts` | Participant-facing stage view |
| `<stage_type>_answer.ts` | Answer/response display component |

## Styling

- **Material 3 Design** via SASS variables in `src/sass/`:
  - `_colors.scss` — color palettes and theme tokens
  - `_common.scss` — shared mixins and layout utilities
  - `_typescale.scss` — typography scale definitions
- `src/pair-components/shared.css` — base styles for primitives
- Use SASS variables and mixins — **do not hardcode** colors, spacing, or
  font values

## Key files

| File | Role |
|------|------|
| `src/app.ts` | Root app component and page rendering |
| `src/index.ts` | App entry point |
| `src/service_provider.ts` | MobX service dependency injection |
| `src/shared/` | Shared config, constants, and utilities |
