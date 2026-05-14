---
name: eval-pr
description: >
  Set up a git worktree to run and evaluate an upstream Pull Request locally in
  a flat worktree bare clone repository layout.
---

# Evaluate Pull Request

This skill helps an AI assistant set up a clean, isolated git worktree to evaluate an upstream pull request (PR) locally. This ensures your active development workspace is completely unaffected while testing community contributions or colleague PRs.

## When to use

Invoke this skill when the user asks to:

- "Set up a worktree to run PR <ID> locally"
- "Check out PR <ID> to test"
- "Evaluate pull request <ID> locally"
- "Set up a worktree for PR <ID>"

## Prerequisites

The local repo must have a triangle workflow configured with:
- `origin` pointing to the user's fork (e.g. `jimbojw/deliberate-lab`)
- `upstream` pointing to the canonical repo (`PAIR-code/deliberate-lab`)

Verify with `git remote -v`.

It also assumes a **bare repository layout with flat worktrees** (e.g. `main/`, feature branches, and `.bare/` reside under a single parent directory). Verify this layout with:
```sh
git worktree list
```

## Procedure

### Step 1 — Fetch the PR branch

**Intent**: Fetch the pull request branch directly from `upstream` without adding the contributor's remote.

Run the following command from the repo root:
```sh
git fetch upstream pull/<PR-NUMBER>/head:pr-<PR-NUMBER>
```
This fetches the head of PR `<PR-NUMBER>` and creates a local branch named `pr-<PR-NUMBER>`.

### Step 2 — Determine worktree path and add worktree

**Intent**: Add a new worktree directory as a sibling to the existing worktree directories.

1. Find the parent directory of your current worktree. For example, if your current worktree is at `/path/to/checkout/deliberate-lab/main`, the parent is `/path/to/checkout/deliberate-lab/`.
2. Determine the path for the new worktree (e.g., `../pr-<PR-NUMBER>`).
3. Add the worktree:
   ```sh
   git worktree add ../pr-<PR-NUMBER> pr-<PR-NUMBER>
   ```

### Step 3 — Handover

Once the worktree is created, inform the user that it is ready and provide the path to switch to. The user will handle installing dependencies, building, and running the project from their IDE/terminal.

### Cleanup when done (Optional reference)

If the user asks to clean up the PR worktree later, or for their reference:
1. Ensure the user is not actively inside the worktree directory in their terminal.
2. Remove the evaluation worktree:
   ```sh
   git worktree remove ../pr-<PR-NUMBER>
   ```
3. Delete the local evaluation branch:
   ```sh
   git branch -d pr-<PR-NUMBER>
   ```

## Safety & Style Rules

- **Do NOT nest worktrees**: Never run `git worktree add` to create a directory inside an existing worktree directory. Always place it as a sibling under the main checkout directory.
- **Do NOT use `-D` to delete branches**: Always use `git branch -d` (lowercase) so git can confirm there are no unmerged commits before deletion.
