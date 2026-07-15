#!/usr/bin/env bash
# Delegates to the cross-platform Node checker.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec node "$ROOT/tools/check-button-antipatterns.cjs"
