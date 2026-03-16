# Upload Panel MCP Action Pack

This action pack turns MCP findings into execution-ready items for the upload-panel rollout.

## 1) Supabase MCP Findings (What this adds now)

### Security advisors

1. Function search path mutable warnings (set explicit `search_path`):

- `public.sync_image_geog`
- `public.set_updated_at`
- `public.check_dedup_hashes`

2. Auth setting warning:

- Leaked password protection is disabled.

### Performance advisors

1. Unindexed foreign keys (relevant to uploads):

- `public.dedup_hashes.image_id` FK needs covering index.

2. RLS init-plan warnings (important for insert-heavy upload flow):

- Includes `public.images` policy `images: own insert` and other high-traffic tables.
- Recommendation from advisor: use `(select auth.uid())` and similar `auth.*` wrapper pattern in policies to avoid re-evaluation per row.

## 2) Proposed GitHub Issues (copy/paste)

### Issue A: Harden upload-related SQL function search paths

**Title**
`chore(db): set fixed search_path for upload-related SQL functions`

**Body**

- Context:
  - Supabase Security Advisor flags mutable search_path on:
    - `public.sync_image_geog`
    - `public.set_updated_at`
    - `public.check_dedup_hashes`
- Goal:
  - Update function definitions with fixed search path.
- Acceptance criteria:
  - [ ] Migration updates all listed functions
  - [ ] Functions keep existing behavior
  - [ ] Supabase security advisor no longer reports lint 0011 for these functions
- Notes:
  - Use migration-only DDL changes.

### Issue B: Add covering index for dedup hash image FK

**Title**
`perf(db): add covering index for dedup_hashes image foreign key`

**Body**

- Context:
  - Performance advisor reports unindexed FK on `public.dedup_hashes.image_id`.
- Goal:
  - Add explicit btree index on `dedup_hashes(image_id)`.
- Acceptance criteria:
  - [ ] Migration creates index (idempotent naming)
  - [ ] No behavior changes in dedup logic
  - [ ] Advisor warning is cleared

### Issue C: Optimize upload-path RLS policy eval plan

**Title**
`perf(rls): optimize images insert policy auth init-plan`

**Body**

- Context:
  - Advisor flags `public.images` policy `images: own insert` for per-row auth function re-evaluation.
- Goal:
  - Refactor policy to use `(select auth.uid())` style pattern.
- Acceptance criteria:
  - [ ] Migration updates policy safely
  - [ ] Existing org/user boundary semantics are preserved
  - [ ] Advisor warning for this policy is cleared

### Issue D: Enable leaked password protection in Supabase Auth

**Title**
`security(auth): enable leaked password protection`

**Body**

- Context:
  - Security advisor warns leaked-password protection disabled.
- Goal:
  - Enable in project Auth settings and document rollout.
- Acceptance criteria:
  - [ ] Setting is enabled in hosted project
  - [ ] Team docs mention expected behavior for weak/compromised passwords

## 3) Browser MCP Test Plan (Uploading/Uploaded/Issues)

### Scenario 1: Idle open state

- Open map page.
- Click upload button.
- Verify compact container opens.
- Verify drop area at top and last-upload summary shown when queue empty.

### Scenario 2: Batch visual matrix progression

- Upload >= 10 files.
- Verify dot matrix appears under drop area.
- Verify color progression:
  - gray -> blue pulse -> green
- Inject/force one failure and verify orange dot.

### Scenario 3: Lane switch filtering

- Click `Uploading`, `Uploaded`, `Issues` lanes.
- Verify gallery list updates to selected lane only.
- Verify counts and items match current job states.

### Scenario 4: Issue correction loop

- Open an item from `Issues`.
- Edit address, trigger retry.
- Verify item transitions:
  - Issues (orange) -> Uploading (blue pulse) -> Uploaded (green) on success.
- Verify failed retry keeps item in `Issues` with feedback.

### Scenario 5: Background continuity

- Start batch upload.
- Collapse upload panel.
- Verify uploads continue and trigger/progress indicator still updates.
- Reopen panel and verify state is restored from service.

## 4) Suggested Execution Order

1. Fix search_path warnings (security baseline).
2. Add FK index and optimize `images: own insert` policy (upload throughput).
3. Run advisor checks again.
4. Run browser MCP scenarios against the new upload UI.
