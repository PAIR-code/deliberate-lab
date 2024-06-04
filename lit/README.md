# Lit Frontend

This directory contains a Lit Element / MobX frontend for the LLM Mediation
Experiments project.

> NOTE: This is an in-progress alternative to the Angular frontend,
which has additional functionality and can be viewed/run from `/webapp`.

## Local development

To run locally:

```
cp src/shared/firebase_config_example.ts src/shared/firebase_config.ts
npm run start
```

Then, navigate to [`http://localhost:4201/`](http://localhost:4201/).

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

This initializes the Firebase connection (including firestore, auth).

#### ExperimenterService

`src/services/experimenter_service.ts`

This loads all experiments (for the Home page) and manages experiment
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
It generally corresponds to `src/experiment-components/experiment_config.ts`,
which renders the experiment config editor and manages navigation between
stages.

The other services are stage-specific, managing relevant stage configs
(e.g., InfoStageConfig) as the user is viewing/editing them. Each of these
correspond to `*_config.ts` components, all found under
`src/experiment-components` (see next section).

### Experiment Components and Modules

Experiment components (including configurations and previews)
are organized under `src/experiment-components`.

Standalone or base components (e.g., `survey`, which is used across tasks)
are at the top level of the experiment directory, while any closely
associated components (e.g., for a specific game or task) are clustered
under the `modules` subdirectory.

For example, `src/experiment-components/info` (not a module)
contains info components, which can be flexibly used across many types
of experiments:

- `info_config`: Used during experiment configuration
- `info_preview`: Shown to users during experiment

while components for `voteForLeader` and `leaderReveal` stages
might be organized under a `leader` module
(since they are intended to be used together in the same experiments).

This is to help with eventual organization across multiple types of
experiments: rather than specifying many individual stages
in an experiment config, an experimenter might initially select a few
top-level modules (`leader`, `game1` vs. `game2`) alongside standalone
stages (`info`, `survey`).

#### Config vs. Preview Components

Config components use services in `src/services/config` to update
a new experiment.

Preview components do not use services; rather, they pass in the current
stage as a property.
