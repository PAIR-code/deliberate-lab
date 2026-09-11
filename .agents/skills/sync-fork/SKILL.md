---
name: sync-fork
description: >
  Sync a fork's main branch with upstream and rebase local feature branches.
  Designed for the triangle workflow where development happens in fork feature
  branches and PRs go to the upstream repo.
---

# Sync Fork

Synchronize a fork with its upstream repository, clean up merged branches,
and rebase active feature branches. This skill assumes the standard triangle
workflow:

```
upstream repo (e.g. PAIR-code/deliberate-lab)
    ▲ PRs
    │
  your fork (e.g. <you>/deliberate-lab)
    ▲ push
    │
  local clone (possibly with worktrees)
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

Verify with `git remote -v`. If the remotes don't match this pattern,
explain to the user that this skill expects a triangle workflow which
doesn't appear to be set up, and suggest a course of action. For example,
if a user has cloned their GitHub fork but has no `upstream` remote, suggest
adding it:

```sh
git remote add upstream git@github.com:PAIR-code/deliberate-lab.git
```

## Procedure

### Gather context

Before running any commands, understand the current state:

- `git worktree list` — detect multi-worktree setups
- `git branch -vv` — see all local branches, their tracking refs, and
  whether tracking refs are gone
- `git status` — check for uncommitted changes on the current branch

### Step 1 — Fetch

**Intent**: Update the local repo's view of all remotes.

```sh
git fetch --all --prune
```

The `--prune` flag removes remote-tracking refs for branches that no longer
exist on the remote (e.g. merged and deleted PRs).

### Step 2 — Update main

**Intent**: Fast-forward the local `main` branch to match `upstream/main`,
then push it to `origin` so the fork is in sync.

How to do this depends on the setup:

- **If `main` is checked out in the current worktree** — use
  `git merge --ff-only upstream/main`, then `git push origin main`.
- **If `main` is checked out in a different worktree** — use
  `git update-ref refs/heads/main <upstream-sha> <current-sha>`, then
  `git push origin main`. Warn the user that the other worktree's working
  tree is now stale and may need `git reset --hard`.
- **If `main` is not checked out anywhere** — use either approach.

If fast-forward is not possible (main has diverged from upstream), stop and
tell the user. Do not force-update main.

### Step 3 — Clean up merged branches

**Intent**: Identify and delete local branches whose work has already been
merged into `upstream/main`.

A branch is likely merged if **any** of these are true:

- `git merge-base --is-ancestor <branch> main` (branch is an ancestor of
  main — covers regular merges and rebased branches)
- The branch's remote-tracking ref is gone (e.g. `[origin/<branch>: gone]`
  in `git branch -vv`) — the upstream PR was merged and the branch deleted
- `git log main --oneline --grep="<branch-or-PR-identifier>"` finds a
  squash commit (covers squash merges where the branch is not an ancestor)

For each merged branch:

1. **Ask the user** which branches they want to delete.
2. **Check for worktrees** — you cannot delete a branch that is checked out:
   - If the branch is checked out in the **current worktree** (common when
     the user just merged a PR and came back to sync), switch to `main`
     first so the branch can be deleted.
   - If the branch is checked out in a **different worktree**, tell the user
     to `git worktree remove <path>` first.
3. **Delete with `git branch -d`** (safe delete). Never use `-D`.
4. **Delete the remote branch** on origin if it still exists:
   `git push origin --delete <branch>`.

### Step 4 — Rebase active feature branches

**Intent**: For each remaining local feature branch that is behind `main`,
rebase it so it includes the latest upstream changes.

1. **Ask the user** which branches to rebase (they may not want all of
   them). If the user already specified, skip asking.
2. **Check for uncommitted changes** — warn and skip unless the user
   confirms.
3. **Rebase onto main**: `git checkout <branch> && git rebase main`
4. **If the rebase is clean** and the branch was previously pushed,
   force-push: `git push origin <branch> --force-with-lease`
5. **If there are conflicts** — abort by default (`git rebase --abort`).
   Tell the user which files conflict.
   - **Exception**: if conflicts are trivially obvious (e.g. import
     ordering, adjacent non-overlapping additions), you may resolve them.
     Resolve only when both sides' intent is unambiguous. If any conflict
     is ambiguous, abort the entire rebase.

### Step 5 — Return to original branch

After processing all branches, check out whichever branch the user was on
when the skill was invoked — or `main` if that branch was deleted.

## Safety rules

- **Never rebase `main`** — `main` is always fast-forward only.
- **Always use `--force-with-lease`** — never bare `--force`.
- **Never rebase without user consent** — always confirm which branches to
  rebase (unless they already specified).
- **Abort on ambiguity** — if a conflict resolution is uncertain, abort the
  rebase and ask the user rather than guessing.
- **Use `-d` not `-D`** for branch cleanup — let git's safety check confirm
  the branch is fully merged before deleting.
- **Respect worktrees** — never try to check out or force-update a branch
  that is checked out in another worktree. Use `git update-ref` to update
  refs, or ask the user to switch worktrees.
- **When in doubt, abort and ask** — it is always better to stop and
  confirm with the user than to perform a potentially data-destroying
  action.
