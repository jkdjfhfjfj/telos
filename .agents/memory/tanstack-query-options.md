---
name: TanStack Query v5 hook options
description: Orval-generated hooks type UseQueryOptions with required queryKey in v5; workaround for passing partial options.
---
In TanStack Query v5, `UseQueryOptions` requires `queryKey`. Orval-generated hooks accept `{ query?: UseQueryOptions<...> }` as second arg, so passing `{ enabled: true }` alone fails typecheck.

**Rule:** Cast the query sub-object: `useGetWallet(id, { query: { enabled: !!id } as any })`.

**Why:** The Orval-generated code merges the queryKey automatically at runtime, but TypeScript's type system requires it in the options type. The `as any` on the inner options value is the minimal-invasive fix.

**How to apply:** Any hook call with `{ query: { ... } }` options needs `as any` on the inner object. Never cast the full second argument.
