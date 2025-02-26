---
title: Platform design
layout: default
---

## /utils

Utils are organized by stage (under `/utils/src/stages`). Each stage has:

- Main file (e.g., `survey_stage.ts`) defining relevant types and functions,
(e.g., stage, stage's participant answer, and stage's public data)

- Validation file (e.g., `survey_stage.validation.ts`) defining type
checks that are used by Firebase cloud functions (and their frontend endpoints)

## /functions

Functions are organized by the object (e.g., participant, survey stage)
that they update.

## /frontend

The frontend web app includes:

- `pair-components`: UI components including buttons, tooltips
- `components`: Core platform components organized by directory, notably:
  - `experiment_builder`: Interface for creating/editing experiments
  - `experiment_manager`: Dashboard for managing experiment cohorts and participants
  - `participant_previewer`: Stage et al. screens viewed by experiment participants
- `services`: MobX services managing state. Services ending in `service.ts`
run for all users (both researchers and participants); `experiment.editor.ts` is used
to locally assemble an experiment before writing to Firestore; and `experiment.manager.ts`
is used for the experiment management dashboard (visible when researchers click
on an experiment)
