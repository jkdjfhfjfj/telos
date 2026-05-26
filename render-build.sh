#!/usr/bin/env bash
set -e

echo "=== Installing pnpm@10 into /tmp (outside workspace) ==="
npm install --prefix /tmp/pnpm-install pnpm@10
export PATH="/tmp/pnpm-install/node_modules/.bin:$PATH"

# Explicitly set the user agent so the workspace preinstall guard recognises pnpm
PNPM_VERSION=$(pnpm --version)
export npm_config_user_agent="pnpm/${PNPM_VERSION} npm/? node/$(node --version) linux x64"

echo "=== Installing dependencies ==="
pnpm install --no-frozen-lockfile

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
