---
number: 2
title: Prefer Self-Diagnosing Scripts Over Documentation Bloat
date: 2026-09-11
status: ratified
deciders:
  - "@jimbojw"
  - "Antigravity"
area: area:workspace
supersedes: []
superseded_by: null
---

# 0002. Prefer Self-Diagnosing Scripts Over Documentation Bloat

## Context

AI coding agents and human developers operating in Deliberate Lab frequently encounter environment and toolchain papercuts:
- Missing or mismatched Node.js versions (e.g. Deliberate Lab requires Node 22, but subshells may default to host Node 24 or lack NVM in `$PATH`).
- Multi-remote ambiguity in GitHub CLI (`gh`), where fork topologies require setting a default remote (`gh repo set-default PAIR-code/deliberate-lab`).
- Missing monorepo build artifacts (`utils/dist`, `functions/lib`, or `node_modules`).

The conventional instinct when discovering these papercuts is to document them as static instructions or troubleshooting checklists in `AGENTS.md` or `README.md`.

However, during active pairing on #1236, this pattern demonstrated severe failure modes:
1. **Instruction Overload**: As `AGENTS.md` grows, coding agents either skim past long lists of manual checks or burn critical token budget on irrelevant instructions.
2. **Passive vs. Active Guidance**: Static documentation relies on the agent remembering to manually run exploratory commands. If an agent forgets to check, it fails silently later.

## Decision

We establish the governance canon that **toolchain and environment papercuts must be addressed through active diagnostic scripts rather than expanding static documentation**.

Specifically:
1. **Automated Detection**: Diagnostic tools (such as `workspace-overview.sh`) must actively inspect the runtime environment (Node runtime, git worktrees, toolchain auth, remote defaults, build artifacts).
2. **Actionable Remediation**: When a problem is detected, the script must output an explicit, copy-pasteable remediation command directly to stdout (e.g., `export PATH="...:$PATH"`, `gh repo set-default PAIR-code/deliberate-lab`, `npm run build -w utils`).
3. **Lean `AGENTS.md`**: `AGENTS.md` should only instruct the agent to run the diagnostic script upon entering the workspace (`./.agents/skills/workspace-overview/scripts/workspace-overview.sh`), leaving the operational details to the script.

## Consequences

- When new toolchain or environment frictions arise, contributors should add detection and remediation logic to `workspace-overview.sh` (or related workspace scripts) rather than adding paragraphs to `AGENTS.md`.
- `AGENTS.md` remains lean, high-signal, and invariant-focused.
- Coding agents receive dynamic, context-accurate guidance directly in their execution output.
