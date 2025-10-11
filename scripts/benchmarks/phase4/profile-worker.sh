#!/usr/bin/env bash
set -euo pipefail

# Profile the worker run using V8's --prof and produce a processed profile
# Usage: ./scripts/benchmarks/phase4/profile-worker.sh [--use-copy] [lexemes]
# Examples:
#  ./scripts/benchmarks/phase4/profile-worker.sh --use-copy 1000
#  ./scripts/benchmarks/phase4/profile-worker.sh 100

OUTDIR=$(pwd)/benchmarks/phase4
mkdir -p "$OUTDIR"

LEXEMES=${2:-1000}
USE_COPY_FLAG=""
if [ "${1:-}" = "--use-copy" ]; then
  USE_COPY_FLAG="--use-copy"
fi

echo "Profiling worker run (lexemes=${LEXEMES})..."

# Run the worker under V8 profiler (node --prof). We run via tsx to handle TypeScript.
# The V8 profiler will write a file like `isolate-0x...-v8.log` into the working directory.
export NODE_OPTIONS='--prof --no-logfile-per-isolate'

# Run the TypeScript worker
# Note: you might want to pre-seed your DB or use a local test DB per harness guidance.
tsx scripts/benchmarks/phase4/run-worker.ts $USE_COPY_FLAG || {
  echo "Worker failed; check output above." >&2
  exit 1
}

# Find the latest v8 log generated
V8_LOG=$(ls -1t isolate-*-v8.log 2>/dev/null | head -n1 || true)
if [ -z "$V8_LOG" ]; then
  echo "No V8 log found. Ensure node --prof created an isolate-*-v8.log file." >&2
  exit 1
fi

PROCESSED="$OUTDIR/$(basename "$V8_LOG").processed.txt"

# Process the V8 log into human readable form
node --prof-process "$V8_LOG" > "$PROCESSED"

# Move raw log into benchmarks folder too to keep artifacts together
mv "$V8_LOG" "$OUTDIR/"

echo "Profiling complete. Raw log: $OUTDIR/$(basename "$V8_LOG")"
echo "Processed profile: $PROCESSED"

echo "Tip: open the processed profile and look for heavy entries in 'paradigm.compute' vs 'paradigm.persist'."

# Recommend cleaning up NODE_OPTIONS
unset NODE_OPTIONS

exit 0
