# Media Bucket Cutover and `images` Table Removal Playbook

Status: Executed (legacy `public.images` removed)
Scope: Move storage bucket usage from `images` to `media`, then remove legacy `public.images` dependencies and finally drop legacy tables.

## Progress

1. Started: `media` bucket initialization migration added.

- `supabase/migrations/20260327121000_storage_media_bucket_init.sql`

2. Started: object data move runner added.

- `scripts/migrate-storage-images-to-media.mjs`

3. Started: dual-read signing fallback (`media` -> `images`) in app services.

- `apps/web/src/app/core/photo-load.service.ts`
- `apps/web/src/app/core/zip-export.service.ts`
- `apps/web/src/app/core/upload/upload.service.ts`

4. Started: DB decoupling phase 1 migration applied.

- `supabase/migrations/20260327124000_prepare_images_fk_decoupling_phase1.sql`
- Added nullable `media_item_id` columns + backfill + new FKs to `media_items`.

5. Completed: schema-level FK dependencies on `public.images` removed.

- `supabase/migrations/20260327125500_drop_images_foreign_keys_phase2.sql`

6. Completed: function dependencies on `public.images` removed.

- `supabase/migrations/20260327131500_rewrite_images_functions_to_media_items.sql`

7. Completed: policy + view dependencies on `public.images` removed.

- `supabase/migrations/20260327132450_remove_images_policy_view_dependencies.sql`

8. Completed: legacy table dropped.

- `supabase/migrations/20260327132500_drop_legacy_images_table.sql`

### Data Move Runner

Environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Dry run:

```bash
node scripts/migrate-storage-images-to-media.mjs --dry-run --page-size=500
```

Copy all:

```bash
node scripts/migrate-storage-images-to-media.mjs --page-size=500
```

Copy subset by prefix:

```bash
node scripts/migrate-storage-images-to-media.mjs --prefix=<org_id>/ --page-size=500
```

Overwrite existing objects in `media`:

```bash
node scripts/migrate-storage-images-to-media.mjs --overwrite --page-size=500
```

### Readiness Validation SQL

Run the full gate checklist:

```bash
npx supabase db query --linked -f scripts/validate-media-cutover-readiness.sql -o table
```

Latest snapshot (2026-03-27, post-cutover):

- `c_media_items_without_media_object = 0`
- `c_fk_dependencies = 0`
- `c_views_ref_images = 0`
- `c_functions_ref_images = 0`
- `c_policies_ref_images = 0`
- `drop_status = READY_TO_DROP_IMAGES`

Backfill snapshot after decoupling phase 1 (2026-03-27):

- `coordinate_corrections`: `0 / 50` rows with `media_item_id`
- `dedup_hashes`: `62 / 74`
- `image_metadata`: `9 / 2386`
- `image_projects`: `4 / 1982`
- `saved_group_images`: `1 / 118`
- `share_set_items`: `0 / 0`

Dependency snapshot after final decoupling (2026-03-27):

- FK dependencies to `public.images`: `0`
- Functions referencing `public.images`: `0`
- Policies referencing `public.images`: `0`
- Table existence check: `to_regclass('public.images') = NULL`

## Goal

Complete migration with controlled risk:

1. Bucket migration `images` -> `media`
2. Data move of storage objects
3. Switch all signing/upload paths
4. ACL/RLS alignment
5. Backward-compat fallback for existing `storage_path` references
6. Final cutover and legacy cleanup (`public.images` and dependents)

## Preconditions

1. Supabase project is linked locally:
   - `npx supabase link --project-ref <PROJECT_REF> --workdir "c:\\Users\\kleve\\Projects\\feldpost\\supabase"`
2. Build is green in `apps/web`.
3. Migration work happens in one tracked branch.

## Execution Plan

| Phase | Action                  | Deliverables                                                                                           | Gate to continue                                        |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| A     | Inventory and freeze    | Full list of `storage.from('images')`, `client.from('images')`, DB objects referencing `public.images` | Inventory complete, no unknown consumers                |
| B     | Introduce new bucket    | Create bucket `media`; mirror policies and limits from `images`                                        | Upload/signing works in sandbox against `media`         |
| C     | Dual-read compatibility | Add fallback read/sign logic: try `media`, fallback `images` for old rows                              | No user-facing regressions in map/media/detail/download |
| D     | Data move               | Copy existing objects `images/*` -> `media/*` with verification counts/hash where feasible             | 100% moved (or explicit exception list)                 |
| E     | Switch writes           | New uploads write to `media` only                                                                      | No new object appears in old `images` bucket            |
| F     | Remove DB legacy writes | Remove remaining `client.from('images')` write paths; only `media_items` remains                       | Build + upload tests pass                               |
| G     | RLS/FK migration        | Remove references to `public.images` in FK/RPC/RLS/views/functions                                     | SQL audit reports 0 dependencies                        |
| H     | Final cutover           | Remove read fallback to old bucket/table; enforce `media` only                                         | Runtime smoke tests pass                                |
| I     | Cleanup                 | Drop legacy tables and obsolete migrations/compat code                                                 | Post-drop SQL checks all green                          |

## SQL Audit Checklist (must be green before Drop)

### 1) Remaining dependencies on `public.images`

```sql
select
  con.conname as constraint_name,
  conrelid::regclass as child_table,
  confrelid::regclass as parent_table,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
where con.contype = 'f'
  and confrelid = 'public.images'::regclass
order by child_table::text, constraint_name;
```

### 2) Views / functions still referencing `public.images`

```sql
select schemaname, viewname
from pg_views
where definition ilike '%public.images%'
order by 1,2;

select n.nspname as schema_name, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%public.images%'
order by 1,2;
```

### 3) Orphans: `media_items` without storage object

```sql
select count(*) as media_items_without_storage_object
from public.media_items m
left join storage.objects o
  on o.bucket_id = 'media'
 and o.name = m.storage_path
where o.id is null;
```

### 4) Orphans: storage objects without `media_items`

```sql
select count(*) as storage_objects_without_media_item
from storage.objects o
left join public.media_items m
  on m.storage_path = o.name
where o.bucket_id = 'media'
  and m.id is null;
```

### 5) Drop-ready decision

```sql
with checks as (
  select
    (select count(*) from public.media_items m
      left join storage.objects o on o.bucket_id='media' and o.name=m.storage_path
      where o.id is null) as c_media_without_file,
    (select count(*) from storage.objects o
      left join public.media_items m on m.storage_path=o.name
      where o.bucket_id='media' and m.id is null) as c_file_without_media,
    (select count(*) from pg_constraint con
      where con.contype='f' and confrelid='public.images'::regclass) as c_fk_to_images,
    (select count(*) from pg_views v
      where v.definition ilike '%public.images%') as c_views_using_images
)
select *,
  case when c_media_without_file=0
         and c_file_without_media=0
         and c_fk_to_images=0
         and c_views_using_images=0
       then 'READY_TO_DROP_IMAGES'
       else 'NOT_READY'
  end as drop_status
from checks;
```

## Final Drop Migration (only when `READY_TO_DROP_IMAGES`)

Create migration and apply only after all gates are green.

```sql
-- Example skeleton (adapt to final dependency graph)
-- drop dependent FKs/views/functions first
-- then drop legacy tables

drop table if exists public.coordinate_corrections cascade;
drop table if exists public.saved_group_images cascade;
drop table if exists public.image_metadata cascade;
drop table if exists public.images cascade;
```

## Rollback Strategy

1. Keep fallback read path active until post-cutover smoke tests pass.
2. Keep old bucket objects untouched until full validation done.
3. If regression occurs, revert app to fallback mode and re-run audits before retry.

## Tracking Notes

- Storage bucket split per file format is out of scope for this migration.
- Canonical target remains one bucket (`media`) with media type handled in metadata (`media_items.media_type`, `mime_type`).
