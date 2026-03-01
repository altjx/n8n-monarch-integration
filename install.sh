#!/usr/bin/env bash
# install.sh — Installs the Monarch Money custom node into n8n.
#
# Supports two modes:
#
#   Local install (npm global, default):
#     ./install.sh
#     Copies node files into ~/.n8n/custom/ and prompts you to restart n8n.
#
#   Docker install:
#     ./install.sh --docker [CONTAINER_NAME]
#     Copies node files into the container's /home/node/.n8n/custom/ directory
#     and restarts the container. Container name defaults to "n8n".
#
# The ~/.n8n/custom/ directory is n8n's official custom node directory and is
# automatically scanned at startup regardless of how n8n is installed.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$REPO_DIR/dist"

DOCKER=false
CONTAINER="n8n"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --docker)
      DOCKER=true
      if [[ -n "${2:-}" && "${2:-}" != --* ]]; then
        CONTAINER="$2"
        shift
      fi
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: ./install.sh [--docker [CONTAINER_NAME]]"
      exit 1
      ;;
  esac
  shift
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

copy_files() {
  local dest="$1"

  echo "==> Copying credential..."
  cp "$DIST/credentials/MonarchApi.credentials.js"     "$dest/"
  cp "$DIST/credentials/MonarchApi.credentials.js.map" "$dest/"

  echo "==> Copying node files..."
  cp "$DIST/nodes/Monarch/GenericFunctions.js"     "$dest/"
  cp "$DIST/nodes/Monarch/GenericFunctions.js.map" "$dest/"
  cp "$DIST/nodes/Monarch/Monarch.node.js"         "$dest/"
  cp "$DIST/nodes/Monarch/Monarch.node.js.map"     "$dest/"
  cp "$DIST/nodes/Monarch/Monarch.node.json"       "$dest/"
  cp "$DIST/nodes/Monarch/monarch.svg"             "$dest/"

  echo "==> Copying node descriptions..."
  mkdir -p "$dest/descriptions"
  for f in AccountDescription BudgetDescription CashFlowDescription CategoryDescription NetWorthDescription TransactionDescription index; do
    cp "$DIST/nodes/Monarch/descriptions/${f}.js"     "$dest/descriptions/" 2>/dev/null || true
    cp "$DIST/nodes/Monarch/descriptions/${f}.js.map" "$dest/descriptions/" 2>/dev/null || true
  done

  echo "==> Patching codex for custom node loader..."
  sed -i.bak 's/n8n-nodes-base\.monarch/CUSTOM.monarch/g' "$dest/Monarch.node.json" 2>/dev/null || \
    sed -i '' 's/n8n-nodes-base\.monarch/CUSTOM.monarch/g' "$dest/Monarch.node.json"
  rm -f "$dest/Monarch.node.json.bak"
}

# ---------------------------------------------------------------------------
# Docker mode
# ---------------------------------------------------------------------------

if $DOCKER; then
  CUSTOM_DIR="/home/node/.n8n/custom"

  echo "==> Checking container '$CONTAINER' is running..."
  if ! docker inspect "$CONTAINER" > /dev/null 2>&1; then
    echo "ERROR: Container '$CONTAINER' not found. Is it running?"
    exit 1
  fi

  echo "==> Creating custom node directory in container..."
  docker exec "$CONTAINER" mkdir -p "$CUSTOM_DIR/descriptions"

  echo "==> Copying files to container..."
  # Copy via a temp dir since docker cp can't do individual files to an existing dir cleanly
  TMP_DIR="$(mktemp -d)"
  copy_files "$TMP_DIR"
  docker cp "$TMP_DIR/." "$CONTAINER:$CUSTOM_DIR/"
  rm -rf "$TMP_DIR"

  echo "==> Restarting container '$CONTAINER'..."
  docker restart "$CONTAINER"

  echo ""
  echo "==> Done! The Monarch Money node is now available in n8n."

# ---------------------------------------------------------------------------
# Local mode
# ---------------------------------------------------------------------------

else
  N8N_FOLDER="${N8N_USER_FOLDER:-$HOME/.n8n}"
  CUSTOM_DIR="$N8N_FOLDER/custom"

  echo "==> Creating custom node directory at $CUSTOM_DIR..."
  mkdir -p "$CUSTOM_DIR/descriptions"

  copy_files "$CUSTOM_DIR"

  echo ""
  echo "==> Done! Restart n8n to load the Monarch Money node."
  echo ""
  echo "    If running with npm:    restart the n8n process"
  echo "    If running with Docker: docker restart <container-name>"
  echo "    If using a custom N8N_USER_FOLDER, re-run with:"
  echo "      N8N_USER_FOLDER=/your/path ./install.sh"
fi
