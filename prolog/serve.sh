#!/usr/bin/env bash
# Start the FERRS Prolog reasoning service.  Usage: ./serve.sh [PORT]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec swipl "$HERE/serve.pl" "$@"
