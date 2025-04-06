---
title: Changelog
layout: default
---

This page summarizes notable updates to the Deliberate Lab platform.

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