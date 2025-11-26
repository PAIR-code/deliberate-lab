---
title: Adding a new stage
layout: default
---

## Setting up agent support
Add a new class that extends the `BaseStageHandler` interface
(specified in `utils/src/stages/stage.handler.ts`) for your specific stage
and make sure that class is initialized in `StageManager`
(under `utils/src/stages/stage.manager.ts`).

This will include implementing the following functions:
- `getStageDisplayForPrompt`: Use the given stage context
to assemble a string that can be added to a prompt (a list of participants
can be provided in order to incorporate answers from those participants
in the string)
- `getDefaultMediatorStructuredPrompt`: Default prompt that agent mediators
should use for this stage type; note that this is likely undefined for
non-chat stages
- `getDefaultParticipantsStructuredPrompt`: Default prompt that agent
participants should use for this stage type (will likely include a custom
structured output object based on what needs to be complete for the stage;
if the stage, e.g., info, does not require a prompt, this should return
undefined)
- `getAgentParticipantActionsForStage`: Specifies whether the given stage
requires an API call for agent participant completion and if the agent should
"move" to the next stage after completing
- `extractAgentParticipantAnswerFromResponse`: Builds a stage-specific
participant answer based on a parsed response from the API call

## How this works in practice
### Structured prompts
When a structured prompt is being built, if the prompt includes context from
a specific stage, the `StageManager` will call `getStageDisplayForPrompt` for
the specific stage type in order to get an appropriate string to include
in the prompt. (This happens in `functions/src/structured_prompts.utils.ts`.)

### Agent participants
When an agent participant is "completing" a stage, the logic in
`functions/src/agent_participant.utils.ts` will check
`getAgentParticipantActionsForStage` to see if an API call is required. If so,
a structured prompt will be constructed using
`getDefaultParticipantStructuredPrompt` and the API will be queried for a
response (this includes logging the API call for the log dashboard and
storing a parsed version of the response). Then, the response will be sent
to `extractAgentParticipantAnswerFromResponse` to build a participant answer;
if a valid one is built, it is written to storage at the correct path
(which will then trigger any relevant public stage data to update).