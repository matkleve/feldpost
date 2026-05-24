# N:N locations migration — closure QA

**Date:** 2026-05-23  
**Plan:** N:N locations closure (Phases A–F)

## Automated gates

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript build | `cd apps/web && npx ng build` | (run locally) |
| Location helpers | `cd apps/web && npx ng test --include=**/media-locations.helpers.spec.ts --browsers=ChromeHeadless --watch=false` | (run locally) |
| Detail fields helper | `cd apps/web && npx ng test --include=**/media-detail-fields.helper.spec.ts --browsers=ChromeHeadless --watch=false` | (run locally) |
| Design system | `npm run design-system:check` | (if SCSS touched) |

## Manual matrix

| Scenario | Expected | Pass |
| --- | --- | --- |
| Multi-pin item | Map menu lists all GPS links; cluster = distinct media count | |
| Address-only link | No grid map icon; `zoomableLocationCount === 0` | |
| Address-only → zoomable | Same link: `update_media_item_location` with lat/lng → count ≥ 1, map icon + viewport pin | |
| Upload + GPS | Link exists; visible on map | |
| Detail delete last row | Title/address clears without full pane reload | |
| Detail field save | Header `address_label` updates without extra list RPC when `displayLocationId` set | |
| Attach keep + existing zoomable | No fake `(1,1)` coords; attach-keep respects zoomable count | |

## Notes

- E2 (`media_item_locations` table drop) remains **blocked** until shim RPCs no longer return `SETOF media_item_locations`.
