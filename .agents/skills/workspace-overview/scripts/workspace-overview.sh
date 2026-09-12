#!/usr/bin/env bash
#
# workspace-overview.sh — Deliberate Lab Workspace & Environment Diagnostic
#
# Inspects:
# 1. Node.js version against .nvmrc with automated discovery & PATH remediation
# 2. Git bare repository topology, active worktree, and sibling worktrees
# 3. Toolchain status (remotes, gh CLI auth)
# 4. Monorepo dependencies and build artifacts (utils/dist, functions/lib)
#

set -uo pipefail

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "Usage: $(basename "$0")"
  echo "Inspects Deliberate Lab workspace environment, Node runtime, git topology, toolchain, and build artifacts."
  exit 0
fi

generate_overview() {
  echo "======================================================"
  echo "         Deliberate Lab — Workspace Overview         "
  echo "======================================================"
  echo ""

# -----------------------------------------------------------------------------
# 1. Locate .nvmrc and Determine Target Node Version
# -----------------------------------------------------------------------------
find_nvmrc() {
  local dir="${1:-$PWD}"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.nvmrc" ]; then
      echo "$dir/.nvmrc"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  # Also check sibling directories if in bare container
  for sibling in "$PWD"/*/.nvmrc; do
    if [ -f "$sibling" ]; then
      echo "$sibling"
      return 0
    fi
  done
  return 1
}

NVMRC_FILE="$(find_nvmrc || true)"
REQUIRED_NODE="22"
if [ -n "$NVMRC_FILE" ] && [ -f "$NVMRC_FILE" ]; then
  REQUIRED_NODE="$(tr -d '[:space:]v' < "$NVMRC_FILE")"
fi
REQUIRED_MAJOR="$(echo "$REQUIRED_NODE" | cut -d. -f1)"

echo "[1/4] Node.js & Runtime Environment"
echo "      Source of truth (.nvmrc): Node v${REQUIRED_MAJOR}"

# Check active node in $PATH
echo "      $ command -v node"
ACTIVE_NODE_PATH="$(command -v node 2>/dev/null || true)"
ACTIVE_NODE_VERSION=""
ACTIVE_NODE_MAJOR=""
NODE_MATCHED=false

if [ -n "$ACTIVE_NODE_PATH" ]; then
  ACTIVE_NODE_VERSION="$(node -v 2>/dev/null | tr -d 'v' || true)"
  ACTIVE_NODE_MAJOR="$(echo "$ACTIVE_NODE_VERSION" | cut -d. -f1)"
  if [ "$ACTIVE_NODE_MAJOR" = "$REQUIRED_MAJOR" ]; then
    NODE_MATCHED=true
    echo "      [OK] Active Node: v${ACTIVE_NODE_VERSION} ($ACTIVE_NODE_PATH)"
  else
    echo "      [WARN] Active Node is v${ACTIVE_NODE_VERSION} ($ACTIVE_NODE_PATH), but v${REQUIRED_MAJOR} is required."
  fi
else
  echo "      [WARN] Node.js is not found in the current \$PATH."
fi

# Tiered Discovery & Remediation if not matched
if [ "$NODE_MATCHED" = false ]; then
  CANDIDATE_NODE=""

  # Search NVM directories
  NVM_PATHS=(
    "${NVM_DIR:-$HOME/.nvm}/versions/node"
    "$HOME/.nvm/versions/node"
  )
  for nvm_dir in "${NVM_PATHS[@]}"; do
    if [ -d "$nvm_dir" ]; then
      # Find all matching v<REQUIRED_MAJOR>.* directories and pick highest version
      latest_match="$(find "$nvm_dir" -maxdepth 1 -type d -name "v${REQUIRED_MAJOR}.*" 2>/dev/null | sort -V | tail -n1)"
      if [ -n "$latest_match" ] && [ -x "$latest_match/bin/node" ]; then
        CANDIDATE_NODE="$latest_match/bin/node"
        break
      fi
    fi
  done

  # Search FNM / ASDF / Volta if NVM didn't yield a match
  if [ -z "$CANDIDATE_NODE" ]; then
    for fnm_dir in "$HOME/.local/share/fnm/current/bin" "$HOME/.fnm/current/bin"; do
      if [ -x "$fnm_dir/node" ]; then
        ver="$("$fnm_dir/node" -v 2>/dev/null | tr -d 'v')"
        if [ "$(echo "$ver" | cut -d. -f1)" = "$REQUIRED_MAJOR" ]; then
          CANDIDATE_NODE="$fnm_dir/node"
          break
        fi
      fi
    done
  fi

  if [ -n "$CANDIDATE_NODE" ]; then
    CANDIDATE_DIR="$(dirname "$CANDIDATE_NODE")"
    CANDIDATE_VER="$("$CANDIDATE_NODE" -v 2>/dev/null || echo "v${REQUIRED_MAJOR}")"
    echo "      [FOUND] Compatible binary discovered: $CANDIDATE_VER ($CANDIDATE_NODE)"
    echo ""
    echo "      👉 Action Required for Agent / Shell:"
    echo "         To use Node ${REQUIRED_MAJOR} in this session (and persistent terminal sessions), run:"
    echo "         export PATH=\"${CANDIDATE_DIR}:\$PATH\""
    echo ""
  else
    # Check if NVM is installed
    if [ -f "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
      echo "      [ERROR] Node v${REQUIRED_MAJOR} is not installed in NVM."
      echo "      👉 Run: nvm install ${REQUIRED_MAJOR} && nvm use ${REQUIRED_MAJOR}"
    else
      echo "      [ERROR] Node.js v${REQUIRED_MAJOR} is not installed on this system."
      echo "      👉 Please install Node.js v${REQUIRED_MAJOR} directly or via NVM (https://github.com/nvm-sh/nvm)."
    fi
  fi
fi
echo ""

# -----------------------------------------------------------------------------
# 2. Git & Worktree Topology
# -----------------------------------------------------------------------------
echo "[2/4] Git & Worktree Topology"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "      [ERROR] Not inside a git repository."
else
  # Check if in a bare container or a worktree checkout
  IS_INSIDE_WORK_TREE="$(git rev-parse --is-inside-work-tree 2>/dev/null || echo "false")"
  IS_BARE_ROOT=false
  if [ "$IS_INSIDE_WORK_TREE" != "true" ] && ([ -d ".bare" ] || [ -f ".git" ]); then
    IS_BARE_ROOT=true
  fi

  CURRENT_DIR="$(basename "$PWD")"
  echo "      Current directory: $CURRENT_DIR"

  if [ "$IS_BARE_ROOT" = true ]; then
    echo "      Current context:   Bare repository parent container (holding .bare/ and sibling worktrees)"
    echo "      Working tree:      (n/a - switch to a sibling worktree directory to edit code)"
  else
    echo "      $ git branch --show-current && git rev-parse --short HEAD"
    CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
    [ -z "$CURRENT_BRANCH" ] && CURRENT_BRANCH="(detached HEAD)"
    CURRENT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
    echo "      Current branch:    $CURRENT_BRANCH ($CURRENT_COMMIT)"

    # Uncommitted changes
    echo "      $ git status --porcelain"
    DIRTY_COUNT="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
    if [ "$DIRTY_COUNT" -eq 0 ]; then
      echo "      Working tree:      clean"
    else
      echo "      Working tree:      $DIRTY_COUNT uncommitted file(s)"
    fi

    # Upstream tracking
    echo "      $ git rev-parse --abbrev-ref @{u}"
    TRACKING_REF="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
    if [ -n "$TRACKING_REF" ]; then
      COUNTS="$(git rev-list --left-right --count "HEAD...$TRACKING_REF" 2>/dev/null || echo "0 0")"
      AHEAD="$(echo "$COUNTS" | awk '{print $1}')"
      BEHIND="$(echo "$COUNTS" | awk '{print $2}')"
      echo "      Tracking ref:      $TRACKING_REF (ahead: $AHEAD, behind: $BEHIND)"
    else
      echo "      Tracking ref:      (none configured)"
    fi
  fi

  echo ""
  echo "      $ git worktree list"
  echo "      Worktrees:"
  git worktree list 2>/dev/null | while read -r line; do
    wt_path="$(echo "$line" | awk '{print $1}')"
    wt_commit="$(echo "$line" | awk '{print $2}')"
    wt_branch="$(echo "$line" | awk '{$1=""; $2=""; print $0}' | sed 's/^[ \t]*//')"

    rel_path="$(realpath --relative-to="$PWD" "$wt_path" 2>/dev/null || echo "$wt_path")"
    [[ "$rel_path" != /* && "$rel_path" != .* ]] && rel_path="./$rel_path"

    if [[ "$wt_branch" == *"(bare)"* ]] || [ "$wt_commit" = "(bare)" ]; then
      echo "          ${rel_path} (bare)"
    else
      dirty_count="$(git -C "$wt_path" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
      status_str="[clean]"
      if [ -n "$dirty_count" ] && [ "$dirty_count" -gt 0 ]; then
        status_str="[dirty: ${dirty_count} file(s)]"
      fi

      if [ "$wt_path" = "$PWD" ]; then
        echo "       ==> ${rel_path} ($wt_commit) ${wt_branch} ${status_str} [current]"
      else
        echo "          ${rel_path} ($wt_commit) ${wt_branch} ${status_str}"
      fi
    fi
  done

  echo ""
  echo "      $ git branch -vv"
  git branch -vv 2>/dev/null | sed 's/^/          /'
fi
echo ""

# -----------------------------------------------------------------------------
# 3. Toolchain & Remotes
# -----------------------------------------------------------------------------
echo "[3/4] Toolchain & Remotes"

# Remotes check
if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "      $ git remote -v"
  git remote -v 2>/dev/null | sed 's/^/      /'
fi

# GitHub CLI check
echo "      $ gh api user -q .login"
if command -v gh >/dev/null 2>&1; then
  GH_USER="$(gh api user -q .login 2>/dev/null || true)"
  if [ -n "$GH_USER" ]; then
    echo "      [OK] GitHub CLI (gh): Authenticated as @${GH_USER}"
    echo "      $ gh repo set-default --view"
    GH_DEF_REPO="$(gh repo set-default --view 2>/dev/null || true)"
    if [ -n "$GH_DEF_REPO" ]; then
      echo "      [OK] GitHub CLI (gh): Default repo is $GH_DEF_REPO"
    else
      echo "      [WARN] GitHub CLI (gh): Default repo not set across remotes"
      echo "      👉 Run: gh repo set-default PAIR-code/deliberate-lab"
    fi
  else
    echo "      [WARN] GitHub CLI (gh): Installed but not authenticated (run 'gh auth login')"
  fi
else
  echo "      [WARN] GitHub CLI (gh): Not installed in \$PATH"
fi
echo ""

# -----------------------------------------------------------------------------
# 4. Monorepo Build Artifacts & Dependencies
# -----------------------------------------------------------------------------
echo "[4/4] Monorepo Artifacts & Dependencies"

# Find the worktree root containing package.json
WORKTREE_ROOT="$PWD"
if [ ! -f "$WORKTREE_ROOT/package.json" ]; then
  # If at bare root, check main or first worktree
  for cand in "$PWD"/main "$PWD"/*; do
    if [ -f "$cand/package.json" ]; then
      WORKTREE_ROOT="$cand"
      break
    fi
  done
fi

if [ -f "$WORKTREE_ROOT/package.json" ]; then
  # Check root node_modules
  if [ -d "$WORKTREE_ROOT/node_modules" ]; then
    echo "      [OK] node_modules: Installed in $(basename "$WORKTREE_ROOT")"
  else
    echo "      [WARN] node_modules: Missing in $(basename "$WORKTREE_ROOT"). Run: npm ci"
  fi

  # Check utils/dist (critical shared library)
  if [ -d "$WORKTREE_ROOT/utils/dist" ] && [ -n "$(ls -A "$WORKTREE_ROOT/utils/dist" 2>/dev/null)" ]; then
    echo "      [OK] utils/dist: Built (shared types & utilities available)"
  else
    echo "      [WARN] utils/dist: Missing or empty. Downstream packages (functions, frontend) will fail."
    echo "             👉 Run: npm run build -w utils"
  fi

  # Check functions/lib
  if [ -d "$WORKTREE_ROOT/functions/lib" ] && [ -n "$(ls -A "$WORKTREE_ROOT/functions/lib" 2>/dev/null)" ]; then
    echo "      [OK] functions/lib: Built"
  else
    echo "      [INFO] functions/lib: Not built (needed if running/testing Cloud Functions; run: npm run build -w functions)"
  fi
else
  echo "      [INFO] Bare repository root container. Switch to a worktree directory to inspect node_modules and build artifacts."
fi

  echo ""
  echo "======================================================"
  echo "Overview complete. Follow any [WARN] or [ERROR] instructions above."
  echo "======================================================"
}

OVERVIEW_OUTPUT="$(generate_overview)"
TOTAL_BYTES="${#OVERVIEW_OUTPUT}"
LIMIT="${OVERVIEW_BUFFER_LIMIT:-7000}" # Safe ceiling comfortably below 8,192 byte terminal buffer (ADR 0003 Standard 5)

if [ "$TOTAL_BYTES" -gt "$LIMIT" ]; then
  OUT_FILE="$(mktemp "${TMPDIR:-/tmp}/workspace-overview-XXXXXX.txt")"
  printf "%s\n" "$OVERVIEW_OUTPUT" > "$OUT_FILE"
  echo "Workspace overview (${TOTAL_BYTES} bytes) exceeds 8KB terminal limit; saved to: ${OUT_FILE} (view with view_file)"
else
  printf "%s\n" "$OVERVIEW_OUTPUT"
fi
