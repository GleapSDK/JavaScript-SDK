#!/usr/bin/env bash
# Bootstrap a fresh git worktree: the push hook, the dependencies and Playwright's Chromium. Run once from inside the
# new worktree. It copies no .env: the SDK reads none.
set -euo pipefail

here=$(git rev-parse --show-toplevel)
cd "$here"

# CI uses Node 24; an older shell default cannot run the tools.
if ! node --version 2>/dev/null | grep -qE '^v(2[4-9]|[3-9][0-9])'; then
  latest=$(ls -d "$HOME/.nvm/versions/node"/v24* 2>/dev/null | sort -V | tail -1)
  if [ -n "$latest" ]; then
    export PATH="$latest/bin:$PATH"
  fi
fi
echo "using node $(node --version)"

sh .githooks/install.sh

# npm ci, not npm install: install rewrites package-lock.json and leaves the worktree dirty. Its prepare step builds the
# bundles, which rewrites the tracked build/ and published/latest/: put them back.
npm ci
git checkout -- build published/latest
git clean -fdq -- published

# For npm run test:smoke. Shared by every checkout on this machine, so only the first run downloads it.
npx playwright install --only-shell chromium

echo "worktree ready: $here"
