---
number: 1
title: Record Agent Decisions
date: 2026-09-11
status: ratified
deciders:
  - "@jimbojw"
  - "Antigravity"
area: area:workspace
supersedes: []
superseded_by: null
---

# 0001. Record Agent Decisions

## Context

As AI coding agents increasingly serve as primary direct contributors to Deliberate Lab, pairing sessions regularly generate architectural trade-offs, governance verdicts, and operational conventions.

Previously, these decisions lacked a dedicated repository home and suffered from two opposing failure modes:

1. **Instruction Bloat in `AGENTS.md`**: Adding every operational precedent or tooling rationale to `AGENTS.md` bloats the system prompt, consuming token budgets and obscuring non-negotiable repository invariants.
2. **Context Amnesia in Ephemeral Sessions**: Leaving decisions in PR comments, issue discussions, or chat trajectories guarantees that the underlying rationale is lost once the session closes or the branch merges.
3. **Collision with Product Documentation (`docs/`)**: Placing developer-agent governance verdicts in `docs/` is inappropriate because `docs/` serves as the user-facing Jekyll documentation site for behavioral scientists and experimenters running research studies.

## Decision

We establish `.agents/decisions/` to store lightweight, machine-readable Architecture and Governance Decision Records (ADRs/GDRs).

Key principles:

- **The Triad Architecture**:
  - `.agents/skills/` → **Capabilities**: Executable scripts, diagnostic tools, and step-by-step pairing procedures.
  - `AGENTS.md` → **Invariants**: Non-negotiable repository constitution (clean worktrees, conventional commits, package dependency order) loaded into every session prompt.
  - `.agents/decisions/` → **Precedents**: Immutable, sequentially numbered records of architectural and governance verdicts, retrieved just-in-time when agents encounter ambiguity or conduct retrospectives.
- **YAML Frontmatter + Markdown Format**: Every decision record begins with a YAML frontmatter block containing structured metadata (`number`, `title`, `date`, `status`, `deciders`, `area`, `supersedes`, `superseded_by`). This ensures programmatic parseability by scripts and agents while rendering cleanly as a metadata table in GitHub's web UI.
- **Lifecycle States**:
  - `draft`: Proposed decision under review.
  - `ratified`: Formally approved and active project canon.
  - `superseded`: Obsolete precedent replaced by a newer decision (indicated by `superseded_by: <number>`).
- **Immutability Invariant**: Once ratified, decision records are never rewritten or retroactively edited to reflect new opinions. If a policy or architectural direction changes, a new record is created with `supersedes: [<prior_number>]` and the prior record's status is updated to `superseded`.
- **Just-in-Time Retrieval**: Agents should query `.agents/decisions/` when encountering ambiguity, conducting retrospectives, or designing new workflows, rather than loading every decision record into baseline prompt context.

## Consequences

- `AGENTS.md` remains lean and invariant-focused, pointing to `.agents/` for capabilities and precedents.
- Engineering and governance verdicts reached during pairing sessions have a concrete, version-controlled landing zone.
- Retrospectives (e.g. following the FAR rubric) can directly propose Decision Records when a session yields an architectural or policy consensus.
