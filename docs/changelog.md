---
title: Changelog
layout: default
---

This page summarizes notable updates to the Deliberate Lab platform.

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