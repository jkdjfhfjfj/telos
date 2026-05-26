#!/usr/bin/env bash
set -e

echo "=== Enabling pnpm via corepack ==="
corepack enable
corepack prepare pnpm@latest --activate

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
