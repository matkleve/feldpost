# Media detail — Location section (UI)

**Where you see it:** Workspace right pane → open a media item → scroll to section label **Location** (between Details and Metadata).

## Component tree

```
app-media-detail-location-section
├── app-media-location-add-search     ← "Add or search address"
└── [optional] list filter input
└── .media-detail-location-section__list
    └── app-media-location-row × n    ← one DB row each
```

## Who owns what

| Layer | File | Responsibility |
| --- | --- | --- |
| Section shell | `media-detail-location-section.component.*` | Layout, filter, wires children → outputs |
| Add/search | `../media-location-add-search/` | Dropdown UX only |
| Row | `../media-location-row/` | Per-row FSM + actions |
| Data | `MediaDetailViewComponent` | `locations` signal, `MediaLocationsService` calls |
| DB | `core/media-locations/` | RPCs → `media_item_locations` |

## Spec

`docs/specs/ui/media-detail/media-detail-location-section.md`

## Legacy (archived wiring)

Single-address block (address search + street/city/district/country/coordinates rows) removed from this section.
See `apps/web/src/app/archive/media-detail-location-single/README.md`.
