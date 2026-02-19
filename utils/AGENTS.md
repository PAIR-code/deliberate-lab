# AGENTS.md — `@deliberation-lab/utils`

Shared TypeScript types, validation functions, and utilities consumed by
both `frontend` and `functions`. Changes here can cause cascading breakage —
always rebuild and run tests before committing.

> See also: [root AGENTS.md](../AGENTS.md) for monorepo-wide conventions.

## Build & test

From the **repository root**:

```sh
npm run build -w utils    # Build with tsup (outputs to dist/)
npm test -w utils         # Run Jest tests (colocated with source)
npm run typecheck -w utils
```

`utils` must be rebuilt before `frontend` or `functions` pick up changes.
During local dev, `run_locally.sh` starts a watcher automatically.

## File naming conventions

### General entities

| Pattern | Purpose |
|---------|---------|
| `<entity>.ts` | Type definitions and interfaces |
| `<entity>.validation.ts` | Runtime validation functions |
| `<entity>.test.ts` | Tests (colocated with source) |

### Stage files (`src/stages/`)

Each stage type follows a consistent naming pattern:

| Pattern | Purpose |
|---------|---------|
| `<stage_type>_stage.ts` | Stage config types, participant answer types, public data types |
| `<stage_type>_stage.validation.ts` | Validation for stage configs and answers |
| `<stage_type>_stage.manager.ts` | `BaseStageHandler` subclass for agent actions and prompt display |
| `<stage_type>_stage.prompts.ts` | Prompt construction helpers for LLM agents |
| `<stage_type>_stage.utils.ts` | Stage-specific utility functions |
| `<stage_type>_stage.test.ts` | Tests |

Not every stage type has all of these files — only the ones it needs.
For example:

- **Minimal** (`tos_stage`): `.ts`, `.validation.ts`, `.manager.ts`,
  `.prompts.ts` — just the basics
- **Full** (`survey_stage`): `.ts`, `.validation.ts`, `.manager.ts`,
  `.prompts.ts`, `.prompts.test.ts` — includes prompt tests

## How to add a new stage type

1. **Define the `StageKind`** — add an entry to the `StageKind` enum in
   `src/stages/stage.ts`
2. **Create stage files** — add files in `src/stages/` following the naming
   pattern above (at minimum `<stage_type>_stage.ts` and
   `<stage_type>_stage.validation.ts`)
3. **Add types to the unions** — update the `StageConfig`,
   `StageParticipantAnswer`, and `StagePublicData` union types in
   `src/stages/stage.ts`
4. **Add transfer migration entry** — update
   `STAGE_KIND_REQUIRES_TRANSFER_MIGRATION` in `src/stages/stage.ts`
5. **Register the handler** — add a handler instance in
   `src/stages/stage.handler.ts` (or import the default `BaseStageHandler`)
6. **Export JSON schema** — register the new types in
   `src/export-schemas.ts` so consumers can validate JSON payloads
7. **Update sibling workspaces** — implement backend logic in
   `functions/src/stages/` and UI components in
   `frontend/src/components/stages/`; register any new endpoints in
   `functions/src/index.ts`

## Variables system

`variables.ts`, `variables.utils.ts`, and `variables.template.ts` implement
a template variable system used in prompts and stage descriptions.
`variables.schema.utils.ts` handles schema-level variable processing.
Variables are defined as `VariableDefinition` objects and resolved at
runtime via `resolveTemplateVariables`.

## Key files

| File | Role |
|------|------|
| `src/index.ts` | Public API barrel file — all exports |
| `src/stages/stage.ts` | `StageKind` enum, base types, union types |
| `src/stages/stage.handler.ts` | `BaseStageHandler` class for stage actions |
| `src/export-schemas.ts` | JSON schema generation for the docs site |
| `src/structured_prompt.ts` | Structured prompt types (mediator + participant) |
| `src/structured_output.ts` | Structured output parsing |
