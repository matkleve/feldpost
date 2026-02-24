# Features (MVP and Beyond)

**Who this is for:** engineers and product owners deciding what to implement.  
**What you’ll get:** a clear, numbered list of capabilities and constraints for GeoSite.

---

## 1. MVP Features

These features define the first shippable version of GeoSite. They map directly to the use cases in `docs/use-cases.md`.

### 1.1 Authentication & User Management

1. **User registration and login**
   - Implemented via Supabase Auth (email/password).
   - New users automatically receive a default role (e.g., `user`) via database trigger.

2. **Session handling**
   - Angular stores the active session/JWT and forwards it with all Supabase calls.

3. **Account deletion**
   - Deleting a user from `auth.users` cascades to `profiles`, `user_roles`, and `images` via `ON DELETE CASCADE`.

See `docs/user-lifecycle.md` for full lifecycle details.

---

### 1.2 Image Ingestion

4. **Image upload from device**
   - User selects one or more photos.
   - Files are uploaded to Supabase Storage with UUID-based file names.

5. **Automatic EXIF extraction**
   - On upload, the system extracts (when available):
     - Latitude
     - Longitude
     - Timestamp
     - Direction / bearing
   - EXIF coordinates are stored as original source of truth.
   - Direction / bearing is stored for future directional features, but **not used in MVP filtering**.

6. **Map preview before save**
   - After upload and EXIF parsing, the image appears as a marker on the map.
   - User can confirm or adjust the location before persisting the final record.

7. **Marker correction**
   - User may drag the marker to correct small positional errors.
   - Corrected coordinates are stored in separate fields; EXIF coordinates are retained.

---

### 1.3 Spatial & Temporal Exploration

8. **Map-first main screen layout**
   - Map is the primary canvas.
   - Prominent address search bar with autocomplete sits above the map.
   - A filter panel (time, project, metadata, max distance) is adjacent to the map.
   - An upload button is available in the map pane.
   - A left sidebar provides navigation (e.g., Map / Projects / Admin / …).

9. **Address search via geocoding service**
   - Address search uses a **geocoding service (provider-agnostic)**.
   - Behaviour:
     - On exact or high-confidence match: center map on the result.
     - If the exact address cannot be resolved: jump to the closest match and explicitly show a notice (e.g., “Using closest match to ...”); never fail silently.

10. **Interactive map navigation**
    - Map rendered via Leaflet + OpenStreetMap tiles.
    - Users can pan and zoom; markers update based on viewport.

11. **Bounding-box queries and lazy loading**
    - Only images within the visible map region are fetched from the database.
    - Pagination and limits applied server-side.
    - The frontend never requests “all images”.

12. **Marker clustering**
    - Clusters represent dense image regions to maintain map readability.

13. **Timeline filtering**
    - Time range filter (slider or date range) restricts which images are shown.
    - Default range: last N years (e.g., 2), configurable.
    - Visual cues (e.g., color/opacity) differentiate older vs newer images.

14. **Detail view**
    - Clicking a marker or image opens a detail panel with:
      - Image thumbnail (then full image on demand)
      - Capture time
      - Project
      - Metadata
      - Owner information

---

### 1.4 Project Grouping & Metadata

13. **Project assignment**
    - Each image can be associated with a project.
    - The same user may work on multiple projects; projects may span locations.

14. **Project filtering**
    - Users can filter images by one or more projects.

15. **Flexible metadata system**
    - Users can define arbitrary metadata keys (e.g., “Fang”, “Türe”, “Material”).
    - Values can be assigned per image.
    - UI supports filtering by metadata key/value.

---

### 1.5 Distance Filtering

16. **Distance-based filtering**
    - Users can restrict results by maximum distance from a reference point (e.g., map center or cluster click point).
    - Preset distances such as 25m / 50m / 100m are provided, plus an optional custom slider.
    - Distance is computed using **effective display coordinates** (corrected coordinates when present, otherwise EXIF coordinates).

---

### 1.6 Security & Performance

17. **RLS-enforced ownership and roles**
    - Users see images they own and, depending on role, additional data.
    - All access enforcement is implemented in PostgreSQL RLS, not in Angular.

18. **Storage security**
    - Images are stored in Supabase Storage with policies that:
      - Restrict upload paths to the owning user.
      - Use UUID-based paths or filenames.
      - Control whether images are public or require signed URLs.

19. **Performance guardrails**
    - All spatial and temporal filters are executed server-side.
    - Thumbnails are used for map and list views; full-resolution images only fetched when needed.
    - DB indexes support efficient bounding-box and time-range queries.

See `docs/architecture.md`, `docs/database-schema.md`, and `docs/security-boundaries.md` for detailed enforcement and schema.

---

## 2. Post‑MVP / Future Considerations

These are *not* in the MVP (see `project-description.md` non-goals), but are natural extensions:

1. **Advanced image editing**
   - Cropping, annotations, measurements.

2. **Before/after overlays**
   - Visual comparison of the same area over time.

3. **Heatmaps and analytics**
   - Density maps of work, issues, or materials.

4. **Offline mode**
   - Local cache and sync for poor connectivity environments.

5. **Richer permission models**
   - Project-based sharing, temporary access links, external stakeholders.

6. **Directional relevance**
   - Use stored camera bearing and view direction to further refine which images are considered relevant.
   - Builds on top of the existing distance and time filters.

7. **Right-click map actions (Upload/Create marker here)**
   - Allow users to right-click on the map and choose “Upload here” or “Create marker here” to start an upload flow anchored at that coordinate.
   - Acts as an additional entry point on top of the standard upload screen.

These should only be tackled once MVP success criteria in `project-description.md` are consistently met.

