#!/usr/bin/env bash
set -e

echo "=== Installing pnpm into /tmp (outside workspace) ==="
npm install --prefix /tmp/pnpm-install pnpm
export PATH="/tmp/pnpm-install/node_modules/.bin:$PATH"

echo "=== Installing dependencies ==="
pnpm install --frozen-lockfile

echo "=== Building frontend (BASE_PATH=/) ==="
cd artifacts/telos-wallet
BASE_PATH=/ pnpm run build
cd ../..

echo "=== Building API server ==="
cd artifacts/api-server
pnpm run build
cd ../..

echo "=== Copying frontend into API dist/public ==="
mkdir -p artifacts/api-server/dist/public
cp -r artifacts/telos-wallet/dist/public/. artifacts/api-server/dist/public/

echo "=== Pushing DB schema to Neon ==="
pnpm --filter @workspace/db run push

echo "=== Build complete ==="
