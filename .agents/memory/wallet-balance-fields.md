---
name: Wallet balance fields not in generated type
description: balanceTlos and balanceUsd are DB columns but not in the OpenAPI Wallet schema, so the generated TypeScript type doesn't include them.
---
The `walletsTable` has `balanceTlos` and `balanceUsd` columns but the OpenAPI `Wallet` schema does not include these fields.

**Rule:** Cast wallet to `any` when accessing: `(wallet as any)?.balanceTlos`.

**How to apply:** To get proper types, add the fields to `lib/api-spec/openapi.yaml` and run `pnpm --filter @workspace/api-spec run codegen`. Until then, use `as any`.
