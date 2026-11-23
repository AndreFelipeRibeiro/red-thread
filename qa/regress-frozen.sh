#!/bin/bash
# The full regression on a frozen copy of the working tree, so work can go on
# while it runs (the runner reads each qa/*.js as its check starts, and an edit
# mid-run gives false failures). One command for what the ship-batch skill
# used to list as steps:
#   1. record the tree id (what the handoff says was tested);
#   2. copy the worktree with anchored excludes (an unanchored `dist` would
#      also drop qa/vendor/**/dist, which the checks need) and link both
#      node_modules folders back in;
#   3. run qa/regress.sh there on its own ports (QA_PORT_BASE, default 9300);
#   4. print the tree id, the log's path and the result; the run is recorded in
#      the worktree's qa/history.log, not the copy's.
#
#   bash qa/regress-frozen.sh [copy folder]
#
# The copy goes to the folder given, or to a new temporary one. JOBS and
# QA_VERBOSE pass through to the runner. Exits as regress.sh does: non-zero
# when any check fails. To stop a run, also kill its `node run.js --all`
# (`pgrep -fl "run.js --all"`), which outlives this script.
set -u
cd "$(dirname "$0")/.."
ROOT="$PWD"

# The tree id comes from a copy of the index, so the real one is untouched.
REAL_INDEX="$(git rev-parse --git-path index)"
TMP_INDEX="$(mktemp)"
cp "$REAL_INDEX" "$TMP_INDEX"
TREE=$(GIT_INDEX_FILE="$TMP_INDEX" git add -A && GIT_INDEX_FILE="$TMP_INDEX" git write-tree)
rm -f "$TMP_INDEX"
DEST="${1:-$(mktemp -d)}"
mkdir -p "$DEST"
rsync -a --delete --exclude=/node_modules --exclude=/qa/node_modules --exclude=/dist --exclude=/.git ./ "$DEST/"
ln -sfn "$ROOT/node_modules" "$DEST/node_modules"
ln -sfn "$ROOT/qa/node_modules" "$DEST/qa/node_modules"

LOG="$DEST/regress.log"
echo "=== frozen copy of tree $TREE (HEAD $(git rev-parse --short HEAD)) in $DEST"
( cd "$DEST" && QA_HISTORY="$ROOT/qa/history.log" QA_PORT_BASE="${QA_PORT_BASE:-9300}" bash qa/regress.sh ) > "$LOG" 2>&1
STATUS=$?
tail -14 "$LOG"
echo "=== tree $TREE · log $LOG · exit $STATUS"
exit $STATUS
