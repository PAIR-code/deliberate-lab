---
title: Changelog
layout: default
---

This page summarizes notable updates to the Deliberate Lab platform.

## 2025-10-21: Miscellaneous improvements for agent chat and experiment workflow
[PR #717](https://github.com/PAIR-code/deliberate-lab/pull/717)

Agent changes:
- (patch) Fix issue with chat message triggers
- (patch) Fix agent min/max number of turns chat setting
- (feature) Enable agents to send initial hardcoded chat messages
- (feature) Add retry loop for API calls
- (feature) Add group prompt items to structured prompts

Other changes:
- (feature) Add support for YouTube iframes in info stage
- (feature) Add bot protection setting that disables pasting in chat
- (feature) Add help/alert panel for experimenters and participants to communicate
- (feature) Add MultiAssetAllocation stage
- (feature) Add new consensus templates
- (feature) Add quickstart gallery cards to home page
- (feature) Add API key warnings to experiment editor

## 2025-08-12: Summer 2025 feature updates and bug fixes
[PR #634](https://github.com/PAIR-code/deliberate-lab/pull/634)

Changelog notes for Summer 2025 merge to be added.

## 2025-06-10: Add automatic cohort transfer by survey answer
Experiment Version: 18 / [PR #535](https://github.com/PAIR-code/deliberate-lab/pull/535)

Enable experimenters to set up automatic cohort transfers: the platform can
now detect when human participants are connected/disconnected; if active
participants in the transfer stage meet the "participant count" requirements
specified in the automatic transfer config (e.g., 2 participants who answered
"yes" to question A and 2 participants who answered "no" to question A),
the relevant participants are moved into a newly created cohort.

Other changes:
- (feature) Add presence detection using Firebase realtime database websocket [PR #507](https://github.com/PAIR-code/deliberate-lab/pull/507)
- (feature) Add option to keep participants in the chat stage for the entire timer countdown [PR #528](https://github.com/PAIR-code/deliberate-lab/pull/528)
- (feature) Add webpack cache busting for prod deployments [PR #526](https://github.com/PAIR-code/deliberate-lab/pull/526)
- (feature) Refactor experiment editor in frontend and add cohort editor panel to dashboard
- (feature) Return error output from LLM API functions

## 2025-05-02: Add early agent participant support
Experiment Version: 18 / [PR #490](https://github.com/PAIR-code/deliberate-lab/pull/490)

- Experimenters can now add default (not configurable from frontend) agent participants to cohorts from the experiment dashboard
- Agent participants use new (automatically triggered) stage prompts/functions to complete survey, ranking, and chat stages (and click through the rest)
- Agents now asynchronously query LLM APIs to generate chat responses and rely on new "triggerLogs" collection to avoid duplicate posting

Other changes:
- (feature) Add utils function to create agent prompts with past stages' context included
- (feature) Add Firestore diagram to documentation
- (feature) Update salesperson game to work with one human participant vs. one agent participant
- (patch) Fix API bug with using obsolete AgentGenerationConfig instead of ModelGenerationConfig
- (patch) Use public stage data, not last chat message, to determine discussion ID for agent generated chat messages
- (patch) Refactor some stages' public data updates into trigger functions

## 2025-04-07: Add structured output support to agent prompts
Experiment Version: 17 / [PR #495](https://github.com/PAIR-code/deliberate-lab/pull/495)

- Experimenters can now configure custom schemas for structured outputs
- Three special fields are supported: a field for the message, a field for whether or not to respond, and a field for an explanation or chain of thought. Experimenters can configure what these fields are named.
- The prompt will include a description of the output schema. Experimenters can disable this if they'd rather supply their own output examples.
- Experimenters can constrain the sampler to output valid json, or to output valid json in the specified schema. This is only supported for the Gemini API so far.
- Experiments with the old isJSON config should still work, but when loaded on frontend for editing, they will be ported to the new structured output config.
- New experiments have a default config with structured outputs enabled, a premade schema with the three special fields, schema prompting, and no output constraints.
- All schemas must be flat. Nested objects and arrays are supported in the backend, but don't have UI support.

## 2025-03-24: Set up new agent configuration workflow at experiment level
Experiment Version: 16 /
[PR #468](https://github.com/PAIR-code/deliberate-lab/pull/468)

Define agent configs at the experiment level, then create agent mediators
(within cohorts) that point to those configs. This update alters the frontend
experiment editor/dashboard as well as backend functions and database schema.

Other changes:
- (feature) Allow experimenters to "pause" agent mediators during chat discussion
- (feature) Allow experimenters to specify different APIs per agent
- (patch) Chip negotiation stage: fix timestamp/indexing bugs
- (patch) Chat stage: fix source of truth for "completed chat discussion" status