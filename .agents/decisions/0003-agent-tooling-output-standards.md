---
number: 3
title: Design Standards for Agent-Facing Diagnostic and Maintenance Scripts
date: 2026-09-11
status: ratified
deciders:
  - "@jimbojw"
  - "Antigravity"
area: area:workspace
supersedes: []
superseded_by: null
---

# 0003. Design Standards for Agent-Facing Diagnostic and Maintenance Scripts

## Context

In [0002. Prefer Self-Diagnosing Scripts Over Documentation Bloat](./0002-prefer-self-diagnosing-scripts.md), we established the canon that environment and toolchain papercuts must be addressed through active diagnostic scripts (such as `workspace-overview.sh` and `workspace-sync.sh`) rather than expanding static troubleshooting checklists in `AGENTS.md`.

However, traditional CLI script design optimizes for human visual consumption in interactive terminal emulators:
- Saturated ANSI escape sequences (colors, bold text) to highlight status.
- Custom synthetic abstractions (hand-rolled table formatters, padded columns, and translated status strings) that mask underlying command output.
- Machine-specific absolute host paths or ambiguous bare branch names in remediation hints.

During pairing across #1236 (`workspace-overview`) and #1238 (`workspace-sync`), we identified three severe failure modes when AI coding agents execute scripts built with these traditional visual patterns:

1. **The Agent Trust Paradox (Opacity vs. Redundant Tool Calls)**:
   An AI agent's confidence in a diagnostic script's output is inversely proportional to the output's opacity. When a script synthesizes or re-formats git or toolchain state into a custom pretty-printed summary, the agent reflexively suspects missing context or translation loss. The agent then routinely runs the underlying raw commands anyway (`git branch -vv`, `git remote -v`, `git status`), burning context window tokens, tool calls, and wall-clock latency.

2. **Token Inflation and Transcript Serialization**:
   ANSI escape sequences (`\033[32m`, `\033[0m`) provide zero semantic value to Large Language Models. In agent environments, they inflate prompt token counts, degrade regex/grep pattern matching, and serialize as noisy literal escape sequences (`\u001b[...]`) in background task JSON transcripts and persistent execution logs.

3. **Contextual Ambiguity in Remediation**:
   Remediation hints that omit execution context or use absolute host paths (e.g. `/home/developer/...` or `/Users/...`) introduce friction and require the agent or developer to reconstruct the relative working directory before executing the fix.

4. **The Stdout Buffer Truncation Trap (The Head-Loss Ring Buffer)**:
   AI agent harnesses typically enforce an **8 KB (8,192 bytes)** terminal output buffer ceiling for shell command execution (`run_command`). Terminal runners behave like a tail ring buffer, preserving the end of execution and silently discarding lines from the top (`<truncated N lines>`). This is especially treacherous because script outputs routinely place their most critical diagnostic information at the very beginning (such as Node.js version checks, PATH remediation commands, headings, or issue/PR descriptions). When an output exceeds 8 KB, the harness silently discards the exact context the agent needs most.

## Decision

We establish five non-negotiable design standards for all agent-facing diagnostic and maintenance scripts in `.agents/skills/`:

### 1. Plain-Text Canon (Zero ANSI Escape Codes)
- Scripts intended for agent consumption must emit clean, uncolored plain text.
- Do not use ANSI escape sequences (`\033[...]`, `tput`, or `echo -e` color variables).
- Convey semantic status exclusively via plain-text bracketed markers:
  - `[OK]` — Check passed / operation succeeded / up to date.
  - `[WARN]` — Non-fatal warning or drift detected.
  - `[ERROR]` — Fatal condition or command failure.
  - `[DRY RUN]` — Prospective action previewed without mutation.
  - `[REMOVED]` — Resource or worktree successfully pruned.
  - `[SKIP]` — Action skipped (e.g. protecting dirty worktrees).
  - `[BEHIND]` / `[AHEAD]` — Commit drift relative to tracking trunk.
  - `==>` — Section header or target resource delimiter.
- These markers provide 100% of the cognitive and diagnostic signal to both human developers and LLMs with zero token overhead and zero transcript corruption.

### 2. Raw Command Provenance over Synthetic Summaries
- Maintain 1:1 provenance between script output and canonical tool commands.
- Scripts must explicitly echo the command being run prefixed with `$ ` (or `$ [dry-run] `) and stream its raw, unmodified output directly to stdout:
  ```sh
  echo "      $ git branch -vv"
  git branch -vv
  ```
- Do not write custom bash string-parsing loops or table-formatting logic to reformat standard CLI outputs (e.g. `git branch -vv`, `git remote -v`).
- Providing direct, authoritative command output builds agent trust and eliminates redundant verification steps.

### 3. Actionable Relative Paths
- All remediation commands, file references, and worktree labels must use actionable relative paths from the current working directory (`$PWD`) or container root:
  ```sh
  # Correct:
  git -C "./staging" rebase main
  git worktree remove "./pr-1160"

  # Incorrect:
  git -C "/home/developer/deliberate-lab/staging" rebase main
  git worktree remove pr-1160
  ```
- Relative paths are immediately copy-pasteable by human developers and directly executable by agents without path translation.

### 4. Dry-Run Predictability for Mutating Operations
- Any script performing state-mutating operations (`git fetch`, `merge`, `push`, `reset --hard`, `worktree remove`, `branch -D`) must support a `--dry-run` / `-n` flag.
- In dry-run mode:
  - Commands that would execute must be echoed with a `$ [dry-run] ` prefix.
  - Proposed mutations must be flagged with `[DRY RUN]` status badges.
  - No file system or git ref changes may occur.

### 5. Stdout Buffer Ceiling & Automatic Spillover (`<8 KB` Rule)
- Agent harness terminal runners enforce an **8 KB (8,192 bytes)** stdout buffer limit, whereas file viewing tools (`view_file`) can read up to **45 KiB (46,080 bytes)** intact without loss.
- Scripts whose assembled diagnostic or query payload can foreseeably exceed 7,000 bytes (e.g. repos with dozens of worktrees/branches, detailed git diffs, or extensive GitHub issue/PR threads) must buffer their output in memory or a temporary file.
- **Threshold & Branching**:
  - **<= 7,000 bytes**: Emit directly to terminal stdout.
  - **> 7,000 bytes**: Automatically spill the complete, clean plain-text/markdown content to a temporary file via `mktemp "${TMPDIR:-/tmp}/<script-name>-XXXXXX.<ext>"`. Emit a single plain-text notification pointing the agent to inspect the file using `view_file`:
    ```text
    <Diagnostic/Query name> (<N> bytes) exceeds 8KB terminal limit; saved to: /tmp/<script-name>-XXXXXX.<ext> (view with view_file)
    ```
- **Harness Interoperability**: AI agent harnesses permit agents to read `mktemp` files losslessly without triggering security confirmation prompts or human interruptions.
- This pattern guarantees zero context loss, eliminates head truncation, and preserves full fidelity for large payloads.

## Consequences

- **Script Simplicity & Maintainability**: Eliminates brittle bash string manipulation, ANSI variable boilerplate, and column-padding gymnastics.
- **Clean Agent Transcripts**: Execution logs, background task transcripts, and agent context windows remain dense, readable, and free of escape sequence noise.
- **Higher Agent Autonomy & Efficiency**: Coding agents operate with high confidence from the initial script output, eliminating redundant exploratory commands.
- **Immediate Actionability**: Both human developers and agents can copy-paste remediation commands directly from script stdout without mental mapping.
- **Immunity to Terminal Buffer Truncation**: Critical diagnostic context at the top of script outputs (such as Node.js remediation, branch topologies, and issue descriptions) is never silently truncated by the agent harness.
