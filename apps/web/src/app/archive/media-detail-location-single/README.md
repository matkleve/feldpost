# Archived: single-location media detail block

Legacy `MediaDetailLocationSectionComponent` rendered one shared address search row plus street/city/district/country/coordinates fields on `media_items`.

Replaced by multi-location UI per `docs/specs/ui/media-detail/media-detail-location-section.md`.

Child components (`address-search`, `address-field-combobox`, `coordinates-field-editor`) remain in the tree for reference and upload flows; they are no longer wired from the location section.
