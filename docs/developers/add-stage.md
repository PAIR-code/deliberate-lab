---
title: Adding a new stage
layout: default
---

## Agent support
Add a new class that implements the `StageHandler` interface
(specified in `utils/src/stages/stage.manager.ts`) for your specific stage
and make sure that class is initialized in `StageManager`.

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