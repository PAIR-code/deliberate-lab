---
name: sync-fork
description: >
  Sync a fork's main branch with upstream and rebase local feature branches.
  Designed for the triangle workflow where development happens in fork feature
  branches and PRs go to the upstream repo.
---

# Sync Fork

Synchronize a fork with its upstream repository and rebase local feature
branches. This skill assumes the standard triangle workflow:

```
upstream repo (e.g. PAIR-code/deliberate-lab)
    ▲ PRs
    │
  your fork (e.g. <you>/deliberate-lab)
    ▲ push
    │
  local clone
```

## When to use

Invoke this skill when the user asks to:

- "Sync my fork"
- "Update my branches"
- "Pull from upstream"
- "Rebase my branches on main"
- "Catch up with upstream"

## Prerequisites

The local repo must have two remotes configured:

| Remote | Points to |
|--------|-----------|
| `origin` | The user's fork (e.g. `<you>/deliberate-lab`) |
| `upstream` | The canonical repo (e.g. `PAIR-code/deliberate-lab`) |

Verify with `git remote -v`. If `upstream` is missing, add it:

```sh
git remote add upstream git@github.com:PAIR-code/deliberate-lab.git
```

## Procedure

### Step 1 — Run the sync script

Run the helper script from the repository root:

```sh
bash .gemini/skills/sync-fork/scripts/sync-fork.sh
```

This script will:

1. Verify the `upstream` remote exists
2. `git fetch --all --prune`
3. Check out `main`, fast-forward to `upstream/main`
4. Push `main` to `origin`
5. List local branches whose upstream was deleted (merged)
6. List local feature branches that are behind `main`

If the script exits with an error, report it to the user and stop.

### Step 2 — Clean up merged branches

The script will list local branches whose upstream tracking branch has been
deleted (i.e., the PR was merged and the branch removed on GitHub). For each:

1. **Ask the user** which branches they want to delete.

2. **Check for worktrees** — if the script reports a branch has an attached
   worktree, tell the user to remove the worktree first:
   ```sh
   git worktree remove <path>
   ```

3. **Delete with `-d`** (safe delete):
   ```sh
   git branch -d <branch>
   ```
   This will refuse if git doesn't consider the branch fully merged —
   which is an extra safety net. Never use `-D` here.

### Step 3 — Rebase feature branches

The script will also list branches that are behind `main`.
For each branch:

1. **Ask the user** which branches they want to rebase (they may not want
   all of them). If the user already specified which branches to rebase,
   skip asking.

2. **Check for uncommitted changes** — if the branch has uncommitted work,
   warn the user and skip it unless they confirm.

3. **Rebase onto main**:
   ```sh
   git checkout <branch>
   git rebase main
   ```

4. **If the rebase is clean** — force-push to origin:
   ```sh
   git push origin <branch> --force-with-lease
   ```

5. **If there are conflicts** — abort by default:
    - Run `git rebase --abort`
    - Tell the user which branch has conflicts and what files are affected
    - **Exception**: if the conflicts are trivially obvious (e.g., import
      ordering, adjacent non-overlapping additions), you may attempt to
      resolve them:
      - Read the conflicting files
      - Resolve only conflicts where both sides' intent is unambiguous
      - `git add` the resolved files and `git rebase --continue`
      - After all conflicts are resolved, force-push with lease
    - If any conflict is ambiguous, abort the entire rebase — do not
      partially resolve

### Step 4 — Return to the original branch

After processing all branches, check out whichever branch the user was on
when the skill was invoked.

## Safety rules

- **Never rebase `main`** — `main` is always fast-forward only.
- **Always use `--force-with-lease`** — never bare `--force`.
- **Never rebase without user consent** — always confirm which branches to
  rebase (unless they already specified).
- **Abort on ambiguity** — if a conflict resolution is uncertain, abort the
  rebase and ask the user rather than guessing.
- **Use `-d` not `-D`** for merged branch cleanup — let git's safety check
  confirm the branch is fully merged before deleting.
- **Stash gracefully** — if the user has uncommitted changes on the current
  branch, either stash them or warn and skip.
