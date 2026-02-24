# Decisions (ADR‑Lite)

**Who this is for:** engineers and architects modifying GeoSite.  
**What you’ll get:** a concise record of key technical decisions, so you know what can (and cannot) be changed lightly.

---

## Format

Each decision has:

- **Context** – why this was a problem.
- **Decision** – what we chose and any hard constraints.
- **Consequences** – what this enables, and what trade-offs we accept.

This is intentionally light-weight; if a decision would significantly affect invariants or data shape, it must be recorded here.

---

## D1 – Supabase as Backend (Auth + DB + Storage)

**Context**  
We need authentication, a managed PostgreSQL instance with Row-Level Security, and object storage for images. Operating and securing all of this manually would add significant ops overhead.

**Decision**  
Use Supabase as the Backend-as-a-Service provider:

- Supabase Auth for user registration, login, and JWT management.
- Supabase PostgreSQL for all relational data, with RLS for authorization.
- Supabase Storage for image files.

**Consequences**

- We align strongly with Supabase’s mental model (especially RLS and policies).
- We accept Supabase’s limits and update cadence.
- We avoid running our own auth or file storage stack for MVP.

---

## D2 – Database‑First Security (RLS)

**Context**  
The app handles potentially sensitive construction documentation. We must avoid duplicating permission logic in multiple places and ensure that unauthorized users cannot access data, even if the frontend is compromised.

**Decision**  
All authorization is enforced in the database using Row-Level Security policies:

- The frontend (Angular) is treated as untrusted.
- RLS policies use the current `auth.uid()` and roles in `user_roles` / `roles`.

**Consequences**

- All access control logic must be validated and tested at the SQL/RLS level.
- Any new table that contains user- or project-bound data must ship with RLS policies.
- Frontend role checks are allowed only as UX optimizations, never as security guarantees.

See `security-boundaries.md` for policy details.

---

## D3 – Map‑First Navigation (Leaflet + OpenStreetMap)

**Context**  
Core user journeys revolve around “what happened here, and when?”. Folders and pure lists are poor at answering spatial questions.

**Decision**  
Use a map as the primary navigation interface:

- Leaflet for interactive map rendering.
- OpenStreetMap tiles for base map imagery.

**Consequences**

- All key features must work from a map-centric starting point (panning, zooming, clicking markers).
- We accept some dependency on external tile servers; if necessary, we can swap providers later.
- We must optimize for bounding-box queries and clustering to keep map performance acceptable.

---

## D4 – Keep EXIF vs Corrected Coordinates Separate

**Context**  
EXIF coordinates can be off by several meters. Users need to correct markers, but we also need to keep the original sensor data for audits and debugging.

**Decision**  
EXIF coordinates and user-corrected coordinates are stored separately:

- EXIF coordinates are immutable and never overwritten.
- Corrected coordinates, if present, are the default for map display and spatial queries.

**Consequences**

- The schema must support both sets of coordinates.
- Any code performing spatial queries must define which coordinates it uses (typically corrected, with fallback to EXIF).
- We can always reconstruct and understand why an image appears at a given place on the map.

---

## D5 – MVP Scope is Narrow by Design

**Context**  
The domain invites many tempting features (annotations, analytics, before/after comparisons, complex permissions). Shipping nothing because scope is too big is a real risk.

**Decision**  
We intentionally restrict the MVP to:

- Core upload and retrieval flows for technicians and clerks.
- Map + timeline navigation.
- Project grouping and flexible metadata.
- RLS-based security and basic roles.

Non-goals are listed in `project-description.md` and must be treated as such.

**Consequences**

- We say “no” to advanced editing, offline, and analytics in early iterations.
- Architecture should make these future features *possible* but not *required*.
- Success is measured against the MVP success criteria, not long-term vision promises.

---

## D6 – Provider‑Agnostic Geocoding Boundary

**Context**  
GeoSite needs address search with autocomplete on the main map, but we do not want to couple the domain model to a specific geocoding vendor.

**Decision**  
Treat geocoding as a **provider‑agnostic service boundary**:

- Architecture defines a geocoding interface that takes an address string and returns candidate coordinates and address metadata.
- The default implementation uses an OpenStreetMap/Nominatim‑style provider, but this can be swapped.
- The domain model and database schema remain free of provider‑specific concepts.

**Consequences**

- Switching geocoding providers affects only the adapter layer, not the rest of the system.
- Tests and docs should refer to “geocoding service” rather than a concrete vendor name, except in stack/ops discussions.
- Behavioural contract for search is stable (exact vs closest match, explicit notice) regardless of provider.

---

## D7 – MVP Filter Set and Cluster Ordering

**Context**  
Many potential filters (direction, materials, roles, etc.) and ordering schemes exist. MVP needs a simple, deterministic rule set that engineers can implement and test against.

**Decision**  
For MVP:

- Filters:
  - Time range.
  - Project.
  - Metadata key/value.
  - Max distance (based on effective display coordinates: corrected, else EXIF).
- Cluster / result ordering:
  - When clicking a cluster or reference point, “nearby” images are ordered by:
    1. Distance to the reference point (ascending).
    2. Then timestamp (newest first).
  - “Further away” sections may group images into distance buckets beyond the primary radius.

**Consequences**

- Engineers have a clear, testable contract for filter parameters and sorting order.
- Directional relevance remains a post‑MVP enhancement; bearing is stored but not yet exposed to users.
- UI implementations should treat this ordering as part of the product behaviour, not as an incidental choice.

---

## Adding New Decisions

When you introduce a change that:

- Alters core invariants,
- Changes data model shape, or
- Introduces a new external dependency,

add a new section here (`Dx`) and link it from relevant docs (e.g., `architecture.md`, `database-schema.md`).

