---
name: workspace-overview
description: >
  Inspect the local Deliberate Lab workspace environment, Node.js version,
  bare repository worktrees, remotes, git status, and toolchain readiness.
---

# Workspace Overview

Ground an AI agent or developer in Deliberate Lab's local development environment. This skill inspects Node.js against `.nvmrc`, discovers installed runtimes, surveys the bare repository and sibling worktree topology, checks GitHub CLI auth, and verifies monorepo build artifacts.

## When to use

Invoke this skill when:
- Starting a new coding or pairing session.
- Entering the repository workspace for the first time.
- Verifying whether Node.js matches the version required by `.nvmrc`.
- Getting an overview of existing worktrees, branches, and uncommitted edits.
- Diagnosing missing build artifacts (`utils/dist`) or toolchain issues.

Trigger phrases:
- "Orient to workspace"
- "Check environment"
- "Run workspace overview"
- "Check setup"
- "Where am I in the repo?"

## Procedure

### 1. Run the Diagnostic Script

From any worktree directory or the parent repository container, execute:

```sh
./.agents/skills/workspace-overview/scripts/workspace-overview.sh
```

The script visibly echoes the underlying diagnostic commands (`git`, `gh`, etc.) as it runs, providing complete transparency into command provenance and worktree topology. In repositories with dozens of worktrees or branches, if the diagnostic output exceeds 7 KB, it automatically saves to a temporary file via `mktemp` and provides the path for lossless inspection via `view_file` ([ADR 0003](../../decisions/0003-agent-tooling-output-standards.md)).

### 2. Establish Node.js in Persistent Terminal Sessions

Deliberate Lab requires the Node.js major version specified in `.nvmrc` (v22). Non-interactive agent subshells often lack shell initialization or inherit a mismatched host version.

- **Prefer persistent terminal sessions**: Run `workspace-overview.sh` inside a persistent terminal session when supported by your agent harness.
- **Apply remediation**: If the script emits a `[FOUND] Compatible binary discovered` warning with an `export PATH=...` command, execute that command once inside your persistent terminal:

```sh
export PATH="<path-to-discovered-node-bin>:$PATH"
```

Once exported in the persistent session, all subsequent commands (`npm test`, `npm run build`, `npm start`) will automatically inherit the correct Node runtime.

### 3. Act on Diagnostic Warnings

| Section | Diagnostic Warning | Recommended Action |
| :--- | :--- | :--- |
| **Node.js** | Missing / not found in `$PATH` | Apply the emitted `export PATH="...:$PATH"` from Tier 2 discovery. If uninstalled, run `nvm install <version>`. |
| **Node.js** | Major version mismatch | Export the path to the matching Node binary discovered in NVM or install via NVM. |
| **Worktree** | Uncommitted file(s) | Review `git status --short` before switching branches or pulling upstream changes. |
| **Toolchain** | `gh` not authenticated | Run `gh auth login` or verify credentials if PR/issue interactions fail. |
| **Toolchain** | `gh` default repo not set | Run `gh repo set-default PAIR-code/deliberate-lab` to resolve multi-remote ambiguity. |
| **Artifacts** | `node_modules` missing | Run `npm ci` from the worktree root. |
| **Artifacts** | `utils/dist` missing or empty | Run `npm run build -w utils`. `utils` is the shared dependency for `functions` and `frontend`. |
| **Artifacts** | `functions/lib` missing | Run `npm run build -w functions` if running backend tests or the Firebase emulator. |

## Safety Rules

- **Read-only by design**: `workspace-overview.sh` does not modify git refs, switch branches, or alter code. It is safe to run unconditionally at any time.
- **Do not invent Node versions**: Always trust `.nvmrc` as the dynamic source of truth for the required Node version.
