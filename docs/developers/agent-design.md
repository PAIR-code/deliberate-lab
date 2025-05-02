---
title: Agent design
layout: default
---

## Context

Deliberate Lab supports two types of agents:
- **Agent mediators**: Can read and write chat messages during chat stages only
- **Agent participants**: Can progress through experiment stages and read/write chat messages for any relevant stages

## Agent participants

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
experiment/cohort/stage path), the backend will trigger the following
functions for all agent participants in that experiment/cohort:

> `sendAgentParticipantMessage`: For all active agent participants on the
current stage, asynchronously query an LLM API for a chat message response.
If a valid response is generated, wait for the agent's "typing delay"
(calculated based on the agent's "words per minute" setting), then check
Firestore's `triggerLogs` collection to see if a different agent has already
responded to the initial chat message that caused this trigger. (This "trigger
log" check prevents multiple agents from responding all at once, or the same
agent from responding multiple times.) If no agents have responded yet, record
the current agent as the responder in `triggerLogs` and write the chat message
to Firestore.

> `checkReadyToEndChat`: For all active agent participants on the current
stage, query an LLM API to see if that agent is ready to move on from the
current conversation. If true, then either move the agent to the next
discussion (if the chat stage has discussion threads) or the next stage
(if there are not discussion threads or the agent is on the last thread).