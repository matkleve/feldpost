# Photo Multi-Project Membership — Implementation Blueprint

> **Related specs:**
>
> - [element-specs/image-detail-view.md](../element-specs/image-detail-view.md)
> - [element-specs/image-detail-inline-editing.md](../element-specs/image-detail-inline-editing.md)
> - [element-specs/projects-dropdown.md](../element-specs/projects-dropdown.md)
> - [element-specs/workspace-view-system.md](../element-specs/workspace-view-system.md)

## Goal

Allow one photo (`images.id`) to belong to multiple projects at once, while keeping RLS organization boundaries intact and preserving existing workspace/project filters.

## Scope

- Database model: replace direct `images.project_id` dependency with join table `image_projects`.
- Query layer: update RPCs and service queries to use membership joins.
- UI behavior: all "project assignment" interactions become multi-select membership management.

## Data Model

### New Table

```sql
CREATE TABLE IF NOT EXISTS public.image_projects (
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (image_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_image_projects_project_image
  ON public.image_projects (project_id, image_id);

CREATE INDEX IF NOT EXISTS idx_image_projects_image_project
  ON public.image_projects (image_id, project_id);
```

### Organization Integrity Guard

```sql
CREATE OR REPLACE FUNCTION public.enforce_image_project_same_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  image_org uuid;
  project_org uuid;
BEGIN
  SELECT organization_id INTO image_org FROM public.images WHERE id = NEW.image_id;
  SELECT organization_id INTO project_org FROM public.projects WHERE id = NEW.project_id;

  IF image_org IS NULL OR project_org IS NULL OR image_org <> project_org THEN
    RAISE EXCEPTION 'image_projects cross-organization link is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_image_projects_same_org ON public.image_projects;
CREATE TRIGGER trg_image_projects_same_org
  BEFORE INSERT OR UPDATE ON public.image_projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_image_project_same_org();
```

## Migration Plan

1. Add `image_projects` table, indexes, trigger, and RLS policies.
2. Backfill memberships from legacy `images.project_id`:

```sql
INSERT INTO public.image_projects (image_id, project_id)
SELECT id, project_id
FROM public.images
WHERE project_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

3. Update all reads/writes to use `image_projects`.
4. Keep `images.project_id` temporarily for compatibility (one release window).
5. Remove `images.project_id` after code and RPC cutover is complete.

## RLS Policies (Required)

Enable RLS on `image_projects` and scope access by organization via joined parent rows.

```sql
ALTER TABLE public.image_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY image_projects_select_org
ON public.image_projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.images i
    WHERE i.id = image_id
      AND i.organization_id = public.user_org_id()
  )
);

CREATE POLICY image_projects_modify_org
ON public.image_projects
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.images i
    WHERE i.id = image_id
      AND i.organization_id = public.user_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.images i
    WHERE i.id = image_id
      AND i.organization_id = public.user_org_id()
  )
);
```

## RPC and Query Changes

### Cluster / Workspace payloads

Return membership arrays instead of a single `project_id`.

- `project_ids: uuid[]`
- `project_names: text[]`

Reference query pattern:

```sql
LEFT JOIN LATERAL (
  SELECT
    array_agg(p.id ORDER BY p.name) AS project_ids,
    array_agg(p.name ORDER BY p.name) AS project_names
  FROM public.image_projects ip
  JOIN public.projects p ON p.id = ip.project_id
  WHERE ip.image_id = i.id
) ip ON TRUE
```

### Filter by project(s)

Use membership existence checks:

```sql
WHERE EXISTS (
  SELECT 1
  FROM public.image_projects ip
  WHERE ip.image_id = i.id
    AND ip.project_id = ANY(filter_project_ids)
)
```

## Service Contract Changes

### Project membership writes

- `setImageProjects(imageId: string, projectIds: string[]): Promise<void>`
- `addImageToProject(imageId: string, projectId: string): Promise<void>`
- `removeImageFromProject(imageId: string, projectId: string): Promise<void>`

Implementation approach:

1. Diff current memberships vs requested memberships.
2. Insert missing links (`upsert` / insert on conflict do nothing).
3. Delete removed links.
4. Keep operation idempotent and retry-safe.

## UI Cutover Checklist

- Image detail quick info uses "Projects" summary chip.
- Inline editing project field becomes multi-select checklist.
- Thumbnail and marker context actions open membership picker.
- Workspace project filters operate on membership intersection.
- Projects page counts/search aggregates from `image_projects`.

## Rollout Strategy

1. Ship DB migration + dual-read support.
2. Ship service/query updates + UI updates.
3. Validate parity metrics:

- Project counts before/after migration.
- Filter result parity on representative datasets.
- RLS access tests across organizations.

4. Drop legacy `images.project_id` in follow-up migration.

## Test Plan

- Unit: membership diff logic (`setImageProjects`) including no-op, add-only, remove-only, mixed.
- Integration: project filter returns image when image has at least one selected project.
- Integration: image appears in multiple project-scoped views simultaneously.
- Security: cross-org membership insert is rejected.
- Regression: deleting a project removes links but does not delete images.
