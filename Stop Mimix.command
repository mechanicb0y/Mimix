#!/bin/bash
# Mimix: double-click to stop everything "Start Mimix" started (Mac).
cd "$(dirname "$0")" || exit 1
if [ ! -f scripts/local/mimix-local.mjs ]; then echo "Mimix's files are missing from this folder. Copy the whole \"app\" folder from the latest Mimix zip here, then try again."; elif [ -x local/node/bin/node ]; then local/node/bin/node scripts/local/mimix-local.mjs stop; else echo "Mimix is not set up on this computer yet."; fi
sleep 2
