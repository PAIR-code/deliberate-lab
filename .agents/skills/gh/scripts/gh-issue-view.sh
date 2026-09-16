#!/usr/bin/env bash
set -eo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") <issue-or-pr-number> [--no-comments | --comments-only]

View a GitHub Issue or Pull Request cleanly without PTY/Glamour truncation.

Arguments:
  <number>           GitHub Issue or Pull Request number (e.g. 1245)

Options:
  --no-comments      Only display the issue/PR header and description
  --comments-only    Only display the discussion comments thread
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
INCLUDE_COMMENTS=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-comments)
      INCLUDE_COMMENTS=false
      shift
      ;;
    --comments-only)
      INCLUDE_BODY=false
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
  echo "[ERROR] Missing issue or PR number." >&2
  usage 1
fi

if ! [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  echo "[ERROR] Target '$TARGET' must be a numeric Issue or PR number." >&2
  exit 1
fi

# Disable interactive prompts & set timeout (ADR 0003 Standard 6)
export GH_PROMPT_DISABLED=1
GH_TIMEOUT="${GH_TIMEOUT:-5s}"

BODY=""
COMMENTS=""

# Fetch body if requested
if [ "$INCLUDE_BODY" = true ]; then
  body_exit=0
  BODY="$(run_with_timeout "$GH_TIMEOUT" gh issue view "${TARGET}" 2>&1 | cat)" || body_exit=$?
  if [ "$body_exit" -eq 124 ]; then
    echo "[WARN] Timed out querying Issue #${TARGET} after ${GH_TIMEOUT}." >&2
    echo "       The system credential store (e.g. GNOME Keyring) may be locked or awaiting an interactive desktop prompt." >&2
    echo "       👉 Action Required:" >&2
    echo "          - Unlock your desktop session or check for an active keyring prompt." >&2
    echo "          - Once unlocked, re-run $(basename "$0") ${TARGET}." >&2
    exit 124
  elif [ "$body_exit" -ne 0 ]; then
    echo "$BODY" >&2
    echo "[ERROR] Failed to view Issue #${TARGET}." >&2
    exit "$body_exit"
  fi
fi

# Fetch comments if requested
if [ "$INCLUDE_COMMENTS" = true ]; then
  comments_exit=0
  COMMENTS="$(run_with_timeout "$GH_TIMEOUT" gh issue view "${TARGET}" --comments 2>&1 | cat)" || comments_exit=$?
  if [ "$comments_exit" -eq 124 ]; then
    echo "[WARN] Timed out fetching comments for Issue #${TARGET} after ${GH_TIMEOUT}." >&2
    echo "       The system credential store (e.g. GNOME Keyring) may be locked or network stalled." >&2
    COMMENTS=""
  elif [ "$comments_exit" -ne 0 ]; then
    COMMENTS=""
  fi
fi

# Calculate total payload size
TOTAL_BYTES=$(( ${#BODY} + ${#COMMENTS} ))
LIMIT=7000 # Safe ceiling comfortably below 8,192 byte terminal buffer

if [ "$TOTAL_BYTES" -gt "$LIMIT" ]; then
  OUT_FILE="$(mktemp "${TMPDIR:-/tmp}/gh-issue-${TARGET}-XXXXXX.md")"
  {
    if [ -n "$BODY" ]; then
      printf "%s\n" "$BODY"
    fi
    if [ -n "$COMMENTS" ]; then
      if [ -n "$BODY" ]; then
        printf "\n"
      fi
      printf "%s\n" "$COMMENTS"
    fi
  } > "$OUT_FILE"

  echo "$ gh issue view ${TARGET}"
  echo "Output (${TOTAL_BYTES} bytes) exceeds 8KB terminal limit; saved to: ${OUT_FILE} (view with view_file)"
else
  if [ "$INCLUDE_BODY" = true ]; then
    echo "$ gh issue view ${TARGET} | cat"
    printf "%s\n" "$BODY"
  fi

  if [[ -n "$COMMENTS" ]]; then
    if [ "$INCLUDE_BODY" = true ]; then
      echo ""
    fi
    echo "$ gh issue view ${TARGET} --comments | cat"
    printf "%s\n" "$COMMENTS"
  fi
fi
