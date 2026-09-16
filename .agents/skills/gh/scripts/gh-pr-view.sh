#!/usr/bin/env bash
set -eo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") <pr-number> [options]

View a GitHub Pull Request cleanly with metadata, CI checks, discussion comments,
and inline code review comments without PTY/Glamour truncation.

Arguments:
  <number>           GitHub Pull Request number (e.g. 1246)

Options:
  --checks-only      Only display CI status and checks
  --reviews-only     Only display inline code review comments
  --comments-only    Only display general discussion comments
  --no-checks        Skip CI status and checks
  --no-reviews       Skip inline code review comments
  --no-comments      Skip general discussion comments
  -h, --help         Show this help message and exit
EOF
  exit "${1:-0}"
}

# -----------------------------------------------------------------------------
# Helper: Run command with bounded timeout (ADR 0003 Standard 6)
# -----------------------------------------------------------------------------
run_with_timeout() {
  local duration="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$duration" "$@"
  else
    "$@"
  fi
}

TARGET=""
INCLUDE_BODY=true
INCLUDE_CHECKS=true
INCLUDE_COMMENTS=true
INCLUDE_REVIEWS=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --checks-only)
      INCLUDE_BODY=false
      INCLUDE_CHECKS=true
      INCLUDE_COMMENTS=false
      INCLUDE_REVIEWS=false
      shift
      ;;
    --reviews-only)
      INCLUDE_BODY=false
      INCLUDE_CHECKS=false
      INCLUDE_COMMENTS=false
      INCLUDE_REVIEWS=true
      shift
      ;;
    --comments-only)
      INCLUDE_BODY=false
      INCLUDE_CHECKS=false
      INCLUDE_COMMENTS=true
      INCLUDE_REVIEWS=false
      shift
      ;;
    --no-checks)
      INCLUDE_CHECKS=false
      shift
      ;;
    --no-reviews)
      INCLUDE_REVIEWS=false
      shift
      ;;
    --no-comments)
      INCLUDE_COMMENTS=false
      shift
      ;;
    -h|--help)
      usage 0
      ;;
    *)
      if [[ -z "$TARGET" ]]; then
        TARGET="$1"
        shift
      else
        echo "[ERROR] Unexpected argument '$1'" >&2
        usage 1
      fi
      ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  echo "[ERROR] Missing Pull Request number." >&2
  usage 1
fi

if ! [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  echo "[ERROR] Target '$TARGET' must be a numeric Pull Request number." >&2
  exit 1
fi

# Disable interactive prompts & configure timeout (ADR 0003 Standard 6)
export GH_PROMPT_DISABLED=1
GH_TIMEOUT="${GH_TIMEOUT:-5s}"

BODY=""
CHECKS=""
COMMENTS=""
REVIEWS=""

# 1. PR Metadata & Description
if [ "$INCLUDE_BODY" = true ]; then
  body_exit=0
  BODY="$(run_with_timeout "$GH_TIMEOUT" gh pr view "${TARGET}" 2>&1 | cat)" || body_exit=$?
  if [ "$body_exit" -eq 124 ]; then
    echo "[WARN] Timed out querying PR #${TARGET} after ${GH_TIMEOUT}." >&2
    echo "       The system credential store (e.g. GNOME Keyring) may be locked or awaiting an interactive desktop prompt." >&2
    echo "       👉 Action Required:" >&2
    echo "          - Unlock your desktop session or check for an active keyring prompt." >&2
    echo "          - Once unlocked, re-run $(basename "$0") ${TARGET}." >&2
    exit 124
  elif [ "$body_exit" -ne 0 ]; then
    echo "$BODY" >&2
    echo "Tip: If #${TARGET} is an Issue rather than a PR, use ./.agents/skills/gh/scripts/gh-issue-view.sh instead." >&2
    exit "$body_exit"
  fi
fi

# 2. CI Status & Checks
if [ "$INCLUDE_CHECKS" = true ]; then
  c_exit=0
  C_OUT="$(run_with_timeout "$GH_TIMEOUT" gh pr checks "${TARGET}" 2>&1 | cat)" || c_exit=$?
  if [ "$c_exit" -eq 124 ]; then
    echo "[WARN] Timed out querying CI checks for PR #${TARGET} after ${GH_TIMEOUT}." >&2
  elif [ "$c_exit" -eq 0 ] && [ -n "$C_OUT" ] && [[ "$C_OUT" != *"no checks reported"* ]]; then
    CHECKS="$C_OUT"
  fi
fi

# 3. PR-Level Discussion Comments
if [ "$INCLUDE_COMMENTS" = true ]; then
  com_exit=0
  COMMENTS="$(run_with_timeout "$GH_TIMEOUT" gh pr view "${TARGET}" --comments 2>&1 | cat)" || com_exit=$?
  if [ "$com_exit" -eq 124 ]; then
    echo "[WARN] Timed out querying discussion comments for PR #${TARGET} after ${GH_TIMEOUT}." >&2
    COMMENTS=""
  elif [ "$com_exit" -ne 0 ]; then
    COMMENTS=""
  fi
fi

# 4. Inline Code Review Comments
if [ "$INCLUDE_REVIEWS" = true ]; then
  rev_exit=0
  REVIEWS="$(run_with_timeout "$GH_TIMEOUT" gh api repos/{owner}/{repo}/pulls/"${TARGET}"/comments --jq '.[] | "[\(.path):\(.line // "diff")] \(.user.login): \(.body)"' 2>&1 | cat)" || rev_exit=$?
  if [ "$rev_exit" -eq 124 ]; then
    echo "[WARN] Timed out querying inline code review comments for PR #${TARGET} after ${GH_TIMEOUT}." >&2
    REVIEWS=""
  elif [ "$rev_exit" -ne 0 ]; then
    REVIEWS=""
  fi
fi

# Calculate total payload size
TOTAL_BYTES=$(( ${#BODY} + ${#CHECKS} + ${#COMMENTS} + ${#REVIEWS} ))
LIMIT=7000 # Safe ceiling comfortably below 8,192 byte terminal buffer

if [ "$TOTAL_BYTES" -gt "$LIMIT" ]; then
  OUT_FILE="$(mktemp "${TMPDIR:-/tmp}/gh-pr-${TARGET}-XXXXXX.md")"
  {
    if [ -n "$BODY" ]; then
      printf "%s\n" "$BODY"
    fi
    if [ -n "$CHECKS" ]; then
      printf "\n---\n## CI Checks\n\n%s\n" "$CHECKS"
    fi
    if [ -n "$COMMENTS" ]; then
      printf "\n---\n## Discussion Comments\n\n%s\n" "$COMMENTS"
    fi
    if [ -n "$REVIEWS" ]; then
      printf "\n---\n## Inline Code Reviews\n\n%s\n" "$REVIEWS"
    fi
  } > "$OUT_FILE"

  echo "$ gh pr view ${TARGET}"
  echo "Output (${TOTAL_BYTES} bytes) exceeds 8KB terminal limit; saved to: ${OUT_FILE} (view with view_file)"
else
  if [ -n "$BODY" ]; then
    echo "$ gh pr view ${TARGET} | cat"
    printf "%s\n" "$BODY"
  fi

  if [ -n "$CHECKS" ]; then
    if [ -n "$BODY" ]; then
      echo ""
    fi
    echo "$ gh pr checks ${TARGET} | cat"
    printf "%s\n" "$CHECKS"
  fi

  if [ -n "$COMMENTS" ]; then
    if [ -n "$BODY" ] || [ -n "$CHECKS" ]; then
      echo ""
    fi
    echo "$ gh pr view ${TARGET} --comments | cat"
    printf "%s\n" "$COMMENTS"
  fi

  if [ -n "$REVIEWS" ]; then
    if [ -n "$BODY" ] || [ -n "$CHECKS" ] || [ -n "$COMMENTS" ]; then
      echo ""
    fi
    echo "$ gh api repos/{owner}/{repo}/pulls/${TARGET}/comments (inline code reviews)"
    printf "%s\n" "$REVIEWS"
  fi
fi
