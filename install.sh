#!/usr/bin/env bash
# install.sh — Injects the Monarch Money custom node into a running n8n Docker container.
#
# Usage:
#   ./install.sh [CONTAINER_NAME]
#
# Defaults to container name "n8n" if not specified.

set -euo pipefail

CONTAINER="${1:-n8n}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$REPO_DIR/dist"

N8N_NODES_BASE="/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base"

echo "==> Checking container '$CONTAINER' is running..."
if ! docker inspect "$CONTAINER" > /dev/null 2>&1; then
  echo "ERROR: Container '$CONTAINER' not found. Is it running?"
  exit 1
fi

echo "==> Copying Monarch credential..."
docker cp "$DIST/credentials/MonarchApi.credentials.js"       "$CONTAINER:$N8N_NODES_BASE/dist/credentials/"
docker cp "$DIST/credentials/MonarchApi.credentials.js.map"   "$CONTAINER:$N8N_NODES_BASE/dist/credentials/"
docker cp "$DIST/credentials/MonarchApi.credentials.d.ts"     "$CONTAINER:$N8N_NODES_BASE/dist/credentials/"
docker cp "$DIST/credentials/MonarchApi.credentials.d.ts.map" "$CONTAINER:$N8N_NODES_BASE/dist/credentials/"

echo "==> Copying Monarch node..."
docker exec "$CONTAINER" mkdir -p "$N8N_NODES_BASE/dist/nodes/Monarch/descriptions"

for f in GenericFunctions Monarch.node; do
  for ext in js js.map d.ts d.ts.map; do
    docker cp "$DIST/nodes/Monarch/${f}.${ext}" "$CONTAINER:$N8N_NODES_BASE/dist/nodes/Monarch/"
  done
done
docker cp "$DIST/nodes/Monarch/Monarch.node.json" "$CONTAINER:$N8N_NODES_BASE/dist/nodes/Monarch/"
docker cp "$DIST/nodes/Monarch/monarch.svg"        "$CONTAINER:$N8N_NODES_BASE/dist/nodes/Monarch/"

echo "==> Copying node descriptions..."
for f in AccountDescription BudgetDescription CashFlowDescription NetWorthDescription TransactionDescription index; do
  for ext in js js.map d.ts d.ts.map; do
    docker cp "$DIST/nodes/Monarch/descriptions/${f}.${ext}" \
              "$CONTAINER:$N8N_NODES_BASE/dist/nodes/Monarch/descriptions/" 2>/dev/null || true
  done
done

echo "==> Patching package.json to register credential and node..."
docker exec "$CONTAINER" node - <<'EOF'
const fs = require('fs');
const path = '/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

const cred = 'dist/credentials/MonarchApi.credentials.js';
const node = 'dist/nodes/Monarch/Monarch.node.js';

pkg.n8n = pkg.n8n || {};
pkg.n8n.credentials = pkg.n8n.credentials || [];
pkg.n8n.nodes = pkg.n8n.nodes || [];

if (!pkg.n8n.credentials.includes(cred)) pkg.n8n.credentials.push(cred);
if (!pkg.n8n.nodes.includes(node)) pkg.n8n.nodes.push(node);

fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
console.log('package.json patched successfully.');
EOF

echo ""
echo "==> Restarting container '$CONTAINER'..."
docker restart "$CONTAINER"
echo ""
echo "==> Done! The Monarch Money node is now available in n8n."
