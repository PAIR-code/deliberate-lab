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
- "Update PR <ID> to the latest"
- "Refresh my local copy of PR <ID>"
- "Sync PR <ID> worktree"
- "Pull new changes for PR <ID>"

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

### Updating an Existing PR Worktree

If the PR author has pushed new commits and the user wants to refresh their local copy, follow this procedure instead of Steps 1–3.

#### Detect an existing worktree

Before running the initial setup steps, check whether a worktree for the PR already exists:

```sh
git worktree list
```

If a worktree named `pr-<PR-NUMBER>` already exists, skip Steps 1–3 and continue with the update procedure below.

#### Update procedure

From **inside the existing PR worktree directory** (e.g. `../pr-<PR-NUMBER>`):

```sh
# 1. Fetch the latest PR head from upstream
git fetch upstream pull/<PR-NUMBER>/head

# 2. Reset the local branch to match
git reset --hard FETCH_HEAD
```

> [!IMPORTANT]
> **Why `git reset --hard FETCH_HEAD`?** This is someone else's PR — we should
> not rebase or merge. We want our local branch to be an exact mirror of
> whatever the PR author has pushed. `reset --hard` achieves this cleanly.

> [!WARNING]
> If the user has made local modifications to the PR branch (e.g. experimental
> changes while testing), `git reset --hard` will discard them. Warn the user
> before running this command if `git status` shows uncommitted changes or if
> `git log` shows local commits beyond the PR's original commits.

After the reset, the user will likely need to reinstall dependencies and rebuild (e.g. `npm ci`, `npm run build -w utils`, etc.).

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
- **Never rebase or merge someone else's PR branch**: The goal is to mirror the PR exactly, not to modify its history or mix in other changes.
- **Always warn about uncommitted changes**: Before running `git reset --hard`, check `git status` and `git log` for local modifications or commits that would be lost.
