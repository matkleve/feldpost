# Project location picker

> **Parent:** [project-details-view.md](./project-details-view.md)  
> **Service:** [projects-service.md](../../service/projects/projects-service.md)

## What it is

Minimal UI on `/projects/:id` to link org `locations` to a project via `project_locations` (tier-3 upload address + Branch B geocode bias).

## MVP actions

| Action | Behavior |
| --- | --- |
| View | List linked locations; show “No map pin” when not street-level |
| Add | Geocode free-text → `find_or_create_location` → `link_project_location` |
| Remove | `unlink_project_location` |

## Component

- `app-project-location-picker` — [`project-location-picker.component.ts`](../../../../apps/web/src/app/features/projects/project-location-picker.component.ts)

## Acceptance criteria

- [ ] User can link at least one location without SQL
- [ ] Upload batch with project filter can use Branch B when linked location has coords
