# Deprecated schema registry

Columns and tables retained for backward compatibility but **not** used by the active frontend. Safe-drop policy is per row.

| Table | Column | Deprecated since | Frontend | Drop policy |
| --- | --- | --- | --- | --- |
| `projects` | `location_required` | 2026-05 (upload-location fix) | Do not read or write | Safe to drop in a **future** migration after one release; no RPC depends on it |

**References:** [projects-service.md](../specs/service/projects/projects-service.md), migration `20260412124000_projects_location_required.sql`.

Optional DB comment (when applied): `COMMENT ON COLUMN public.projects.location_required IS 'DEPRECATED: see docs/architecture/deprecated-schema.md';`
