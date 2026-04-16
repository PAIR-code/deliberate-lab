#!/usr/bin/env bash
#
# sync-fork.sh — Sync fork's main branch with upstream.
#
# This script handles the mechanical (deterministic) parts of the
# triangle workflow sync:
#
#   1. Verify the upstream remote exists
#   2. Fetch all remotes
#   3. Fast-forward main to upstream/main
#   4. Push main to origin
#   5. List feature branches that are behind main
#
# Feature branch rebasing is intentionally left out — that's the AI
# agent's job since it may require conflict resolution.
#
# Usage:
#   bash .gemini/skills/sync-fork/scripts/sync-fork.sh
#
# Exit codes:
#   0 — success
#   1 — error (missing remote, not a git repo, FF failed, etc.)

set -euo pipefail

# --- Helpers ---

info()  { printf '✓ %s\n' "$*"; }
warn()  { printf '⚠ %s\n' "$*" >&2; }
die()   { printf '✗ %s\n' "$*" >&2; exit 1; }

# --- Preflight checks ---

git rev-parse --is-inside-work-tree &>/dev/null \
  || die "Not inside a git repository."

git remote get-url upstream &>/dev/null \
  || die "No 'upstream' remote found. Add one with:
    git remote add upstream <upstream-url>"

git remote get-url origin &>/dev/null \
  || die "No 'origin' remote found."

# --- Step 1: Fetch all remotes ---

info "Fetching all remotes..."
git fetch --all --prune
info "Fetch complete."

# --- Step 2: Fast-forward main ---

ORIGINAL_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD)
STASHED=false

# If we're not on main, just switch. If we are, no-op.
if [ "$ORIGINAL_BRANCH" != "main" ]; then
  # Check for uncommitted changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    warn "Stashing uncommitted changes on '$ORIGINAL_BRANCH'..."
    git stash push -m "sync-fork: auto-stash before switching to main"
    STASHED=true
  fi
  git checkout main
fi

# Fast-forward main to upstream/main
if git merge --ff-only upstream/main; then
  info "main is now at $(git rev-parse --short HEAD)."
else
  # If FF fails, return to original branch and bail
  if [ "$ORIGINAL_BRANCH" != "main" ]; then
    git checkout "$ORIGINAL_BRANCH"
    if [ "$STASHED" = true ]; then
      git stash pop
    fi
  fi
  die "Cannot fast-forward main to upstream/main.
    main may have diverged from upstream. Manual intervention required."
fi

# --- Step 3: Push main to origin ---

info "Pushing main to origin..."
git push origin main
info "origin/main is now in sync with upstream/main."

# --- Step 4: Return to original branch ---

if [ "$ORIGINAL_BRANCH" != "main" ]; then
  git checkout "$ORIGINAL_BRANCH"
  if [ "$STASHED" = true ]; then
    info "Restoring stashed changes on '$ORIGINAL_BRANCH'..."
    git stash pop
  fi
fi

# --- Step 5: Report feature branches behind main ---

echo ""
echo "=== Feature branches behind main ==="
echo ""

BEHIND_COUNT=0
for branch in $(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v '^main$'); do
  # How many commits is this branch behind main?
  BEHIND=$(git rev-list --count "$branch..main" 2>/dev/null || echo 0)
  if [ "$BEHIND" -gt 0 ]; then
    AHEAD=$(git rev-list --count "main..$branch" 2>/dev/null || echo 0)
    printf "  %-50s %s behind, %s ahead of main\n" "$branch" "$BEHIND" "$AHEAD"
    BEHIND_COUNT=$((BEHIND_COUNT + 1))
  fi
done

if [ "$BEHIND_COUNT" -eq 0 ]; then
  info "All local branches are up to date with main."
else
  echo ""
  echo "$BEHIND_COUNT branch(es) behind main. Rebase recommended."
fi
