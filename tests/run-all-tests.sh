#!/usr/bin/env bash
# Current local checks. Browser scenarios run separately in GitHub Actions.
set -eu
cd "$(dirname "$0")/.."
node scripts/validate-source.cjs
node --test tests/*.test.js
