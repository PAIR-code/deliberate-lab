  # Lit Frontend

This directory contains a Lit Element / MobX frontend for the LLM Mediation
Experiments project.

## Local development

To run locally:

```
cp src/shared/config_example.ts src/shared/config.ts
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

### LLM API

Lit currently uses Google's [Gemini API](https://ai.google.dev/gemini-api)
(you will need your own API key).

Set up config under `src/shared/config.ts`
(fork from `src/shared/config_example.ts`).

The following LLM service manages calls to Gemini API:

`src/services/llm_service.ts`

### Firebase

Set up config under `src/shared/config.ts`
(fork from `src/shared/config_example.ts`).

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

NOTE: Participant pages (defined in RouterService as URLs with participant
IDs specified) are not login-gated.

#### ExperimentService

`src/services/experiment_service.ts`

This manages the current experiment, i.e., whichever one the user is
currently viewing. Specifically, it subscribes to the current experiment's
stages; this information is then used to populate experiment/stage pages.

#### ParticipantService and ChatService

`src/services/participant_service.ts`
`src/services/chat_service.ts`

These manage participation in the current experiment (e.g., updating
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

### Experiment Stages and Games

Experiment components (including configurations and previews)
are organized under `src/experiment-components`.

Standalone stage components (e.g., `survey`, which is used across tasks)
are at the top level of the experiment directory, while any
associated stage components (e.g., for a specific game) are clustered
under the `games` subdirectory.

For example, `src/experiment-components/info` (not specific to a game)
contains info components, which can be flexibly used across many types
of experiments:

- `info_config`: Used during experiment configuration
- `info_preview`: Shown to users during experiment

while components specific to the Lost at Sea game (e.g., pair item scoring)
might be organized under a `lost_at_sea` module.

This is to help with eventual organization across multiple types of
experiments: rather than specifying many individual stages
in an experiment config, an experimenter might initially select a few
top-level modules (`game1` vs. `game2`) alongside standalone
stages (`info`, `survey`).

#### Config vs. Preview Components

Config components use services in `src/services/config` to update
a new experiment (i.e., on the "Create experiment" page).

Preview components pass in data from (and/or use) participant services
(ParticipantService, ChatService); these are used to render experiment stage
pages.


## Building and Production Deployment

A Dockerfile is included to facilitate deployment.

You must build the app first. If you intend to deploy it with a url prefix,
you must define the `URL_PREFIX` environment variable before building:

```bash
npm run build:prod  # Standard build
URL_PREFIX=/my_prefix/ npm run build:prod  # Build with URL prefix
```

This will create the app under `lit/dist/`.

You can then build the docker image:

```bash
docker build . -t mediator-experiments
```

Try it out locally:

```bash
docker run -p 4201:4201 mediator-experiments
```