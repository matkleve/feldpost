# GeoSite – Spatial Construction Image Intelligence

**Who this is for:** frontend and backend engineers implementing GeoSite.  
**What you’ll get:** a clear picture of the problem, the product vision, key use cases, invariants, and MVP scope. Details on architecture, data model, and security live in the other `/docs` files.

---

## 1. Context & Problem

Construction companies already document sites with thousands of photos, but those photos disappear into nested folders like:

- `/country/zip-code/address`
- `/country/zip-code/street`

This folder-based “database” has hard limits:

- No spatial proximity search (only exact folder matches)
- No directional context (where the camera was pointing)
- No time-based exploration beyond rough folder names
- No scalable querying across projects or locations
- Very slow retrieval when preparing quotes or revisiting old work

Technicians and office staff often have the photos they need, but **cannot reliably find them when standing on site or estimating from the office**.

---

## 2. Product Vision

GeoSite is a geo‑temporal image management system for construction companies.

Instead of hunting through folders, a user stands on site (or picks a location on the map) and asks:

> “Show me all photos that inform me about the site I am currently working on.”

GeoSite answers this by:

- Indexing every image by space (lat/lng), time, and project (and storing camera bearing for future use)
- Surfacing relevant photos on an interactive map and timeline
- Enforcing access and integrity in the database (not in the client)

When GeoSite is “done enough”:

- A technician on site can open the app and instantly see relevant historical photos around them.
- A clerk can slice by project, time range, and metadata to prepare a quote in minutes instead of hours.

---

## 3. Key Use Cases (at a glance)

Detailed flows live in `docs/use-cases.md`. This section defines the headline journeys:

- **UC1 – Technician on site (history view)**  
  Standing at a location (via GPS or map/address search), see all nearby images within a radius/distance filter, ordered by proximity and recency, with clear project and metadata context.

- **UC2 – Clerk preparing a quote**  
  From the office, use address search plus filters (time range, project, metadata, distance) to understand prior work and conditions for a given area.

- **UC3 – Marker correction**  
  Adjust a slightly wrong photo position on the map, while preserving original EXIF coordinates for auditability.

---

## 4. Domain Model at a Glance

Full details and tables live in `docs/database-schema.md` and `docs/glossary.md`. This is the mental model engineers should keep in mind:

- **User** (Supabase `auth.users` + `profiles`)  
  Identified and authenticated by Supabase; extended with domain data in `profiles`.

- **Role** (`roles`, `user_roles`)  
  Roles such as `admin`, `user`, `viewer` determine what a user can see or change, enforced via Row-Level Security.

- **Image** (`images`)  
  A record representing a stored file plus its spatial/temporal attributes and ownership:
  - `file_url`
  - `latitude`, `longitude`
  - `created_at` (capture time or upload time)
  - Optional: camera direction / bearing (if available)
  - Project association and metadata (see below)

- **Project & Metadata** (MVP shape defined in `docs/features.md`)  
  Images can be grouped by project and extended with flexible key–value metadata (e.g., “Fang”, “Türe”, “Material”) to support richer filtering.

Key idea: **the database schema is the source of truth for the domain**, with the map, filters, and timelines as projections over it.

---

## 5. Core Invariants

These rules define what must always be true in a valid GeoSite system. Code and database design should be aligned to uphold them.

- **I1 – Every image is owned and scoped**  
  - Each image belongs to exactly one user (via `user_id`) and, where applicable, one tenant/project context.
  - Row-Level Security ensures users only see what they are allowed to see.

- **I2 – Every stored image has spatial and temporal context**  
  - `latitude`, `longitude`, and `created_at` must be present and valid for each image.
  - If EXIF coordinates exist, they are stored as the original source of truth, even if a corrected position is applied later.
  - Distance-based filtering and ordering always use **effective display coordinates** (corrected if present, otherwise EXIF).

- **I3 – Marker correction is additive, not destructive**  
  - Corrections store updated coordinates separately from EXIF data.
  - Original EXIF values are never overwritten, so history and audits remain possible.

- **I4 – Performance guardrail**  
  - The system must never attempt to load all images at once.
  - All map views use bounding-box and server-side filtering; thumbnails are used instead of full-resolution images.

- **I5 – Frontend is untrusted for security**  
  - Angular/Leaflet never enforce permissions; they only render what the backend authorizes.
  - Auth and authorization checks happen in Supabase Auth and PostgreSQL RLS.

---

## 6. MVP Scope – Features

The complete and evolving list of capabilities is maintained in `docs/features.md`. For implementation, these are the **non-negotiable MVP features**:

### 6.1 Authentication

- User registration and login via Supabase email/password.
- Sessions managed via Supabase; Angular stores and forwards the session/JWT.

### 6.2 Image Upload

- Upload a photo from the device.
- On upload, automatically extract EXIF (where available):
  - `latitude`
  - `longitude`
  - `timestamp`
  - `direction` / bearing
- Show a map preview before saving.
- Allow the user to adjust the marker position before finalizing.

### 6.3 Map‑First Main Screen & Spatial Navigation

- Map is the primary canvas:
  - Prominent address search with autocomplete.
  - Filter panel adjacent to the map (time range, project, metadata, max distance).
  - Upload button in the map pane.
  - Left sidebar navigation (e.g., Map / Projects / Admin / …).
- Interactive map (Leaflet + OpenStreetMap).
- Marker clustering for dense areas.
- Bounding-box queries + lazy loading:
  - Only markers in the current viewport are fetched.
  - Pagination / limits handled server-side.
- Address search uses a **geocoding service (provider‑agnostic)**:
  - On successful match: center map on the result.
  - If no exact match exists: jump to the closest result and explicitly show a notice such as “Using closest match to …”; never fail silently.

### 6.4 Filtering

- Time range filter for images (e.g., slider or date range).
- Project filter (one or more projects).
- Metadata key/value filters.
- Max distance filter:
  - Preset distances (e.g., 25m / 50m / 100m) and optional custom slider.
  - Distance computed using effective display coordinates (corrected > EXIF).

### 6.5 Project Grouping

- Ability to assign images to projects.
- Filter images by project.

### 6.6 Flexible Metadata System

- Users can define metadata keys (e.g., “Fang”, “Türe”, “Material”).
- Assign values per image.
- Filter by metadata key/value pairs.

### 6.7 Marker Correction

- Users can drag markers for small positional corrections.
- Original EXIF coordinates are stored and never lost.
- Corrected coordinates are stored in separate fields, used for display and spatial queries.

> **Note on direction/bearing:** camera bearing is extracted and stored from EXIF where available, but **is not used as a user-facing filter in MVP**. Future iterations may introduce directional relevance on top of the existing distance-based model.

---

## 7. Performance & Scalability Requirements

The system should comfortably support:

- Thousands of users
- Tens of thousands of images (and beyond as indexing improves)

Performance guidelines:

- All spatial queries are bounding-box based and executed server-side.
- Filters (time, project, metadata) are applied server-side.
- Only thumbnails are loaded for overview maps; full-resolution images are fetched on demand for detail views.
- Markers are loaded only within the current viewport; panning/zooming triggers incremental fetches, not global reloads.

See `docs/architecture.md` and `docs/database-schema.md` for how indexing, queries, and storage are designed to meet these requirements.

---

## 8. Non‑Goals (MVP)

These are explicitly **out of scope** for the first version to keep the system focused and shippable:

- Advanced image editing (beyond simple rotation/cropping, if any)
- Social sharing and public galleries
- Complex, hierarchical permission models beyond straightforward roles
- Visual before/after comparison overlays
- Heatmaps and advanced analytics
- Manual direction correction UI (beyond what EXIF provides)
- Offline mode

Future iterations can revisit these once the core flows are reliable and performant.

---

## 9. Technical Stack (High Level)

For detailed diagrams, see `docs/architecture.md`. At a high level:

- **Frontend:** Angular single-page application
- **Backend / BaaS:** Supabase
  - Authentication (Supabase Auth)
  - PostgreSQL database
  - Storage for image files
- **Map Layer:** Leaflet with OpenStreetMap tiles
- **Authorization:** Row-Level Security (RLS) in PostgreSQL

All critical invariants around identity, authorization, and data integrity are enforced in the database and Supabase configuration, not in the frontend.

---

## 10. Success Criteria

GeoSite is considered successful (for MVP) if all of the following are true:

- A technician on site can open the app, and within seconds see relevant historical images around their current location.
- A clerk can filter images by project and time range to prepare a quote without guessing folder structures.
- The system remains performant under realistic load (large image datasets; map interactions remain responsive).
- All access control is consistently enforced at the database level using RLS; the frontend never bypasses or duplicates permission logic.

If any of these fail, the gap should be traced back to a violated invariant, missing feature in `docs/features.md`, or incorrect assumption in the architecture or schema docs.