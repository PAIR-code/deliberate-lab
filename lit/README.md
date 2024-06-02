# Lit Frontend

This directory contains a Lit Element / MobX frontend for the LLM Mediation
Experiments project.

NOTE: This is an experiment in progress! Code is not yet connected to
the Firebase backend.

## Local development

To run locally:

```
npm run start
```

## Code structure

### Styling

Global CSS and SASS variables (following Material 3 Design) are defined under
`src/sass`. Use variables and mixins when possible to ensure compatibility
with all color palettes, display sizes, etc. and simplifiy potential
refactors (e.g., changing spacing size or font family).

### UI Components

`src/pair-components` contains existing, standalone UI components
(e.g., button, textarea) that can be used in this project.

`src/components` contains some additional UI components (header, sidenav)
that are designed specifically for this project and/or rely on project
configuration or state (e.g., sidenav has project-specific routing).

### Routing

App pages and routes (including which ones are visible in the sidenav)
are defined in `src/services/router_service.ts`.

The actual rendering of different pages happens in `app.ts`.

The `header` and `sidenav` components (under `src/components`) also notably
contain routing logic.

### Firebase

Services that interact with Firebase are organized at the
`src/services` level and include:

#### FirebaseService

`src/services/firebase_service.ts`

This initializes the Firebase connection (including firestore, auth),
loads all experiments (for the Home page), and manages experiment
and template creation/deletion.

#### AuthService

`src/services/auth_service.ts`

This manages the authentication process and current login state.
(Logic for rendering the login screen/workflow is in `app.ts`.)

#### ExperimentService

`src/services/experiment_service.ts`

This manages the current experiment, i.e., whichever one the user is
currently viewing. Specifically, it subscribes to the current experiment's
stages; this information is then used to populate experiment/stage pages.

#### ParticipantService

Coming soon.

This will manage participation in the current experiment (e.g., updating
a participant's response or stage progress in Firebase).

### Experiment Configuration

Services under `src/services/config` specifically manage the client-side
configuation of a new experiment.

> NOTE: These do not directly connect to Firebase. Rather, they can export
a Firebase-ready experiment config, which is then passed to FirebaseService.

ExperimentConfigService (`src/services/config/experiment_config_service.ts`)
manages metadata (name, number of participants) and list of stages.
It generally corresponds to `src/components/experiment/experiment_config.ts`,
which renders the experiment config editor and manages navigation between
stages.

The other services are stage-specific, managing relevant stage configs
(e.g., InfoStageConfig) as the user is viewing/editing them. Each of these
correspond to `*_config.ts` components, all found under
`src/components/modules` (see next section).

### Component Modules

Both config and preview components for stages are organized under
`src/components/modules`, where each module is a set of closely associated
stages.

For example, `src/components/modules/info` contains info stage components:

- `info_config`: Used during experiment configuration
- `info_preview`: Shown to users during experiment

while `src/components/modules/leader` might contain config/preview
components for both the `voteForLeader` and `leaderReveal` stages
(since they are likely to be used together in the same experiments).

This is to help with eventual organization across multiple types of
experiments, e.g., rather than specifying many individual stages
in an experiment config, an experimenter might initially select a few
top-level modules (`leader`, `chat`, `game1` vs. `leader`, `game2`) with
the option to edit/order specific lower-level stages.