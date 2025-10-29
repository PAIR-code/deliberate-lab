---
title: Agent design
layout: default
---

<div class="banner">
  ⚠️ Documentation in progress
</div>

## Context

Deliberate Lab supports two types of agents:
- **Agent mediators**: Can read and write chat messages during chat stages only
- [alpha] **Agent participants**: Can progress through experiment stages and read/write chat messages for any relevant stages

Both agent types use experimenter-specified *structured prompts* (see below)
when querying LLM APIs.

## Agent participants (alpha mode)

An agent participant uses the same `ParticipantProfile` config as human
participants, except a `ProfileAgentConfig` is added to the profile to specify
which "agent persona" (collection of prompts, API settings, etc.) should be
used.

If a `ProfileAgentConfig` is attached to the participant
profile, the backend will trigger the following functions whenever that
participant profile is updated (including on creation):

> `completeStageAsAgentParticipant`: This attempts to take the next "step"
towards completing the experiment. If the participant currently has an
attention check or transfer pending, it will resolve the notification.
If the participant is in an LLM-supported stage (basic survey, ranking, chat*),
it will query an API (specified in the "agent persona" configs) and write
relevant "participant stage answers" to Firestore. Then, it will attempt to
move to the next stage of the experiment; this involves updating the
ParticipantProfile config and thus re-triggers this function for the agent
participant's new "current stage."

> <small>*Chat stages work slightly differently: the "complete stage" function
will make an `initiateChatDiscussion` call if no chat messages are present yet
so that the agents can start the conversation; otherwise, the chat logic below
is used to complete the chat stage.</small>

Additionally, every time a chat message is written (for a specific
experiment/cohort/stage path), the backend will trigger logic to
send chat messages* and (progress in the experiment if applicable**)
for all agent participants in that experiment/cohort:

> <small>*For all active agent participants on the
current stage, asynchronously query an LLM API for a chat message response.
If a valid response is generated, wait for the agent's "typing delay"
(calculated based on the agent's "words per minute" setting), then check
Firestore's `triggerLogs` collection to see if a different agent has already
responded to the initial chat message that caused this trigger. (This "trigger
log" check prevents multiple agents from responding all at once, or the same
agent from responding multiple times.) If no agents have responded yet, record
the current agent as the responder in `triggerLogs` and write the chat message
to Firestore.</small>

> <small>**The chat message API query includes a structured output field for
"ready to end chat." If this comes back as true, the agent participant
proceeds to the next stage or the next discussion thread in the chat.
</small>

## Structured prompts
Each agent persona is defined with a collection of prompts, where each prompt
is a *structured prompt* (see `utils/src/structured_prompt.ts`) corresponding
to the stage with which the agent is interacting.

A structured prompt is comprised of *structured prompt items*, which can
include blocks like freeform text and "stage context" (the content that a
human participant would see during the stage in the UI, but formatted
specificially for prompt use).

### Stage display (in stage context prompt item)
"Stage display" is the main content (e.g., actual survey questions, as opposed
to stage description) inside a "stage context" prompt item.

Each stage should have this implemented as part of their stage-specific
handler (called by `StageManager` in `utils/src/stages/stage.manager.ts`).

As of September 2025, stage display (for prompts) is supported for the
following stages (check all `*.manager.ts` files in `utils/`):

Stage | Stage display notes
--- | ---
Terms of Service | Shows the terms of service
Info | Shows the info
Group Chat | Shows a list of active participants plus chat history so far, with some explanation of how profiles/timestamps should be interpreted
Private Chat | Same as group chat, minus list of active participants (instead an explanation of who the other participant is)
Role | Shows the display lines specified in the role stage plus the assigned role
Stock Info | Shows stock info stage information
Asset Allocation | Shows asset allocation information
Survey | Shows survey information (and answers if specified in settings)
Survey Per Participant | Shows survey per participant information (and answers if specified in settings)

## [Developer workflow] Adding agent participant support for a stage

See "Adding a new stage" page.

### Add logic to completeStageAsAgentParticipant
Make sure the `completeStageAsAgentParticipant`
(in `functions/src/agent_participant.utils.ts`) includes your stage type.

If relevant, add a helper function to make an API query, update participant
profile status, call `completeStage` (to progress participant to next
stage in experiment config), etc.

If an API query is needed, define a default structured prompt (to be used
if no custom prompt is saved in the experiment builder). If the stage requires
additional settings (e.g., for survey stage, an option to complete all
questions via one API call vs. complete one question per call), create a new
prompt config extending `BasePromptConfig` in `utils/src/structured_prompt.ts`.