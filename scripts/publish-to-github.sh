#!/usr/bin/env bash
# Publish this project to GitHub under valid22 with a single clean commit
# (no Cursor Agent in the contributor list).
#
# Prerequisites: gh auth login  (as valid22)
#
# Usage:
#   ./scripts/publish-to-github.sh
#   ./scripts/publish-to-github.sh my-repo-name
#   VISIBILITY=public ./scripts/publish-to-github.sh

set -euo pipefail

REPO_NAME="${1:-ribosense-ui-refresh}"
OWNER="${GITHUB_OWNER:-valid22}"
VISIBILITY="${VISIBILITY:-private}" # private | public
AUTHOR_NAME="${GIT_AUTHOR_NAME:-valid22}"
AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-10195318+valid22@users.noreply.github.com}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI first: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in. Run: gh auth login"
  exit 1
fi

LOGIN="$(gh api user -q .login)"
if [[ "$LOGIN" != "$OWNER" ]]; then
  echo "Logged in as '$LOGIN', expected '$OWNER'."
  echo "Switch accounts (gh auth login) or set GITHUB_OWNER=$LOGIN"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ribosense-gh.XXXXXX")"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "→ Staging clean tree in $WORK"
git -C "$ROOT" archive HEAD | tar -x -C "$WORK"
cd "$WORK"

git init -b main >/dev/null
git -c commit.gpgsign=false add -A

GIT_AUTHOR_NAME="$AUTHOR_NAME" \
GIT_AUTHOR_EMAIL="$AUTHOR_EMAIL" \
GIT_COMMITTER_NAME="$AUTHOR_NAME" \
GIT_COMMITTER_EMAIL="$AUTHOR_EMAIL" \
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
RiboSense UI refresh

Browser observatory for detecting and classifying genomic riboswitches:
intake, helix theater, TensorFlow cascade (Python-trained, TF.js port),
zoom/export, and Systems CompBio Lab / SASTRA credits.
EOF
)"

echo "→ Author on GitHub will be:"
git log -1 --format='   %an <%ae>'

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "Repo $OWNER/$REPO_NAME already exists — pushing to it."
  git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
else
  echo "→ Creating $OWNER/$REPO_NAME ($VISIBILITY)"
  gh repo create "$OWNER/$REPO_NAME" \
    --"$VISIBILITY" \
    --source=. \
    --remote=origin \
    --description "RiboSense UI refresh — riboswitch detection & classification observatory"
fi

git push -u origin main

echo
echo "Done. Only contributor should be $AUTHOR_NAME."
echo "https://github.com/$OWNER/$REPO_NAME"
echo
echo "Verify contributors:"
echo "  https://github.com/$OWNER/$REPO_NAME/graphs/contributors"
