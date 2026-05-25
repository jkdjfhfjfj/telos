# Telos Wallet

A full-featured Telos Blockchain wallet web app supporting both Telos Zero (native) and Telos EVM accounts, with Google sign-in, 2FA TOTP, a block explorer, and an admin panel.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/telos-wallet run dev` — run the frontend (port 20521)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Neon Postgres connection string, `SESSION_SECRET` — for AES-256 key encryption

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + shadcn/ui + Wouter routing
- Auth: Clerk (Google sign-in + email)
- API: Express 5
- DB: PostgreSQL (Neon) + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Blockchain: ethers.js v6 for EVM, Telos RPC for Zero

## Where things live

- `artifacts/telos-wallet/` — React frontend
- `artifacts/api-server/` — Express API server
- `lib/db/` — Drizzle ORM schema + client
- `lib/api-spec/` — OpenAPI spec (`openapi.yaml`) — source of truth for API contract
- `lib/api-client-react/` — generated React Query hooks (run codegen to regenerate)

## Architecture decisions

- **2FA via speakeasy TOTP** — Clerk doesn't support custom MFA, so TOTP secrets stored encrypted in DB
- **Private key encryption** — AES-256-CBC with SESSION_SECRET; keys never exposed in API responses
- **Dual-network wallets** — each wallet record has both a Telos Zero (12-char) address and an EVM (0x...) address
- **Contract-first API** — OpenAPI spec is the source of truth; hooks and Zod schemas are generated from it
- **requireAdmin middleware** — checks DB user.role, not Clerk metadata, for admin access

## Product

- Landing page with animated hero, features, stats, and CTA sections
- Google sign-in via Clerk; email/password also supported
- Dashboard with wallet overview and network stats
- Wallet creation (Telos Zero + EVM), send, receive with QR codes
- Transaction history per wallet
- Block explorer for both Telos Zero and Telos EVM networks
- Settings page with 2FA TOTP setup/disable
- Admin panel: user management, transaction monitoring, platform stats

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm run typecheck:libs` after any changes to `lib/db` schema before typechecking artifacts
- AES encryption key is derived from `SESSION_SECRET` — changing it invalidates all stored private keys
- Telos Zero RPC: `https://mainnet.telos.net`, EVM RPC: `https://mainnet.telos.net/evm`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for Clerk configuration (managed via Auth pane, not dashboard.clerk.com)
