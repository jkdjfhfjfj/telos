---
name: Admin API direct fetch pattern
description: New admin endpoints (wallets list, withdrawals CRUD) are not in the OpenAPI spec so no generated hooks exist; use a direct fetch helper.
---
Generated React Query hooks only cover endpoints defined in `lib/api-spec/openapi.yaml`. Admin endpoints added directly to `artifacts/api-server/src/routes/admin/index.ts` without updating the spec won't have generated hooks.

**Rule:** Use a local `adminFetch` helper in admin pages:
```ts
async function adminFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api${path}`, { ...opts, headers: { "Content-Type": "application/json", ...opts?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}
```
Then use `useQuery` / `useMutation` from `@tanstack/react-query` directly with custom query keys like `["admin-wallets"]`.

**How to apply:** Either update the OpenAPI spec + run codegen (preferred for type safety), or use the direct fetch helper for admin-only endpoints.
