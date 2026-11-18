#!/usr/bin/env bash
# Compatibility entry point for current source checks; no file-count assumptions.
set -eu
cd "$(dirname "$0")"
node scripts/validate-source.cjs
