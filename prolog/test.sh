#!/usr/bin/env bash
# Run the FERRS Phase 2 test suite (doc 8 §18.1 + §18.6 + service checks).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec swipl "$HERE/run_tests.pl"
