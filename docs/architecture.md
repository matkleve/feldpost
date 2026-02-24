# Architecture Documentation

**Who this is for:** engineers working on system design, data flows, and performance.  
**What you’ll get:** a high‑level view of how GeoSite is put together and where responsibilities and invariants sit.

See also: `project-description.md`, `database-schema.md`, `security-boundaries.md`, and `decisions.md`.

---

## 1. System Overview

GeoSite is a map‑first, geo‑based image management system.

Users can:

- Register and log in.
- Upload images.
- Store geographic coordinates.
- View images on a map.
- Move map markers to update coordinates.

The main screen is **map‑first**:

- A prominent address search bar with autocomplete.
- A filter panel (time, project, metadata, max distance) next to the map.
- An upload button in the map pane.
- A left sidebar for navigation (e.g., Map / Projects / Admin / …).
- A right-hand detail pane that opens when clicking markers or clusters.

The system uses a **Client–BaaS** architecture:

- **Frontend:** Angular SPA.
- **Backend/BaaS:** Supabase (Auth + PostgreSQL + Storage).
- **Map rendering:** Leaflet with OpenStreetMap tiles.

All critical invariants (ownership, access control, data integrity) are enforced in the database and Supabase configuration.

---

## 2. Architectural Layers

### Layer 1 — Identity (Authentication)

Handled entirely by Supabase Auth.

Responsibilities:

- User registration.
- Password hashing.
- JWT issuance.
- Session management.

Table involved:

- `auth.users` (managed by Supabase; not modified manually).

---

### Layer 2 — Domain Profile (Application User Data)

Custom table: `profiles`

Purpose:

- Store application-specific user data.
- Keep `auth.users` minimal.

This creates a 1:1 extension of `auth.users`.

---

### Layer 3 — Authorization (Roles System)

Custom tables:

- `roles`
- `user_roles`

Purpose:

- Define access control.
- Support multiple roles per user.
- Enable a scalable permission model.

Authorization is enforced at the database level using Row-Level Security (RLS).  
See `security-boundaries.md` for policy details and `decisions.md` (D2).

---

### Layer 4 — Domain Data

Primary table:

- `images`

Contains:

- Image metadata.
- Geographic coordinates (EXIF and corrected).
- Ownership reference to the user.
- Links to project and metadata structures (see `features.md` / `glossary.md`).

All domain data is protected via RLS policies.

---

## 3. Geocoding Boundary

GeoSite uses a **geocoding service** to translate addresses into coordinates for the main map search bar.

- At the architecture level, geocoding is treated as a **provider‑agnostic service**:
  - Exposed via an internal API or adapter.
  - Replaceable without changing the domain model.
- Default implementation assumption:
  - An OpenStreetMap/Nominatim‑style provider.

Address search behaviour:

- On exact or high-confidence match:
  - Center the map on the resolved coordinates.
- If no exact match is found:
  - Center on the closest available match.
  - Display an explicit notice (e.g., “Using closest match to …”); never fail silently.

The geocoding layer must not introduce provider‑specific concepts into the core schema; it only returns coordinates and basic address metadata.

---

## 4. Responsibility Boundaries

**Angular (Frontend):**

- UI rendering.
- Form validation.
- Calling Supabase.
- Rendering the map via Leaflet.
- **No security enforcement** (treated as untrusted).

**Supabase Auth:**

- Identity (registration, login, JWT).

**Database (PostgreSQL with RLS):**

- Authorization.
- Data integrity.
- Row-Level Security enforcement for `images`, roles, and other domain tables.

**Storage (Supabase Storage):**

- Secure file storage.
- Access policy enforcement for image files.

**Leaflet:**

- Visualization of spatial data only.
