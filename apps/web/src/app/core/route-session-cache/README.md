# route-session-cache

Root-scoped storage and cross-shell invalidation for route revisit caches.

## Add a new shell

1. Add a `shellKey` in `route-session-cache.keys.ts`.
2. Add a row in `route-session-cache.policies.ts` (upload / delete / restore).
3. Create a thin facade service that:
   - calls `save` / `restore` / `invalidate` on destroy/init
   - registers `registerRevalidateHandler` and/or `registerDeletePatchHandler` in the constructor (synchronously)
4. Document in `docs/specs/service/route-session-cache/route-session-cache-service.md`.

@see docs/specs/system/route-session-cache.md
