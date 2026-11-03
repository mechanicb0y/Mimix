#!/bin/bash
# Mimix: double-click to start (Mac). The first start sets everything up inside the "local" folder.
# Nothing is installed on the system and no administrator password is needed.
cd "$(dirname "$0")" || exit 1
for f in scripts/local/mimix-local.mjs package.json engines/kokoro/server.py; do
  if [ ! -f "$f" ]; then
    echo "Mimix can't start: some of its files are missing from this folder (for example $f)."
    echo "Copy the whole \"app\" folder from the latest Mimix zip into this folder, replacing files, then try again."
    echo "Folder: $PWD"
    read -r -p "Press Return to close."; exit 1
  fi
done
NODE_VERSION=v22.23.4
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)  PLAT=darwin-arm64; SUM=c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428 ;;
  Darwin-x86_64) PLAT=darwin-x64;   SUM=efcc2b0db6f94bf53eddb038fe2b370277a042bd29e4f19b8f8e23598795b819 ;;
  Linux-x86_64)  PLAT=linux-x64;    SUM=b8492284c76a54baf58d61668dd0e41ee0fc98adabf9503d30f05d08f55b4406 ;;
  *) echo "This computer type ($(uname -sm)) isn't supported yet."; read -r -p "Press Return to close."; exit 1 ;;
esac
if [ ! -x local/node/bin/node ]; then
  echo "Downloading Node.js $NODE_VERSION (first start only)..."
  mkdir -p local
  ARCHIVE="local/node-$NODE_VERSION-$PLAT.tar.gz"
  if ! curl -fL --progress-bar -o "$ARCHIVE" "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-$PLAT.tar.gz"; then
    echo; echo "Couldn't download Node.js. Check the internet connection and double-click Start Mimix again."
    read -r -p "Press Return to close."; exit 1
  fi
  if [ "$(shasum -a 256 "$ARCHIVE" | cut -d' ' -f1)" != "$SUM" ]; then
    rm -f "$ARCHIVE"; echo "The Node.js download didn't match its checksum, so it wasn't used. Try again."
    read -r -p "Press Return to close."; exit 1
  fi
  rm -rf local/node "local/node-$NODE_VERSION-$PLAT"
  tar -xzf "$ARCHIVE" -C local && mv "local/node-$NODE_VERSION-$PLAT" local/node && rm -f "$ARCHIVE"
fi
local/node/bin/node scripts/local/mimix-local.mjs start
status=$?
if [ $status -ne 0 ]; then read -r -p "Press Return to close."; fi
exit $status
