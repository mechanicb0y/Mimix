#!/bin/bash
# Mimix: sets the consent check's pass mark from your own recordings (Mac).
# Double-click, then drag a folder into the window: one subfolder per person, three or more recordings each.
cd "$(dirname "$0")" || exit 1
if [ ! -x local/node/bin/node ]; then
  echo "Double-click \"Start Mimix\" once first, so the voice check is installed. Then run this again."
  read -r -p "Press Return to close."; exit 1
fi
local/node/bin/node scripts/local/mimix-local.mjs tune "$1"
read -r -p "Press Return to close."
