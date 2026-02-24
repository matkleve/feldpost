# Glossary

**Who this is for:** anyone reading or writing GeoSite code or docs.  
**What you’ll get:** precise definitions of domain terms and where they show up in the system.

---

## Core Domain Terms

- **GeoSite**  
  The overall system: geo‑temporal image management for construction documentation.

- **User**  
  An authenticated person using GeoSite.  
  - Identity: Supabase `auth.users`.  
  - Domain data: `profiles` table.

- **Profile**  
  Application-specific extension of a user (e.g., full name, company).  
  - Table: `profiles`.  
  - 1:1 with `auth.users` via primary key/foreign key.

- **Role**  
  Label describing a category of permissions (e.g., `admin`, `user`, `viewer`).  
  - Tables: `roles`, `user_roles`.  
  - Used in Row-Level Security (RLS) checks.

- **Technician**  
  A field user documenting construction sites with photos. Typically has role `user`.

- **Clerk**  
  An office user preparing quotes and documentation from historical images. May have role `user` or `viewer`.

- **Admin**  
  User with elevated permissions (see `security-boundaries.md`), including broader visibility and management tasks.

---

## Spatial & Temporal Concepts

- **Image**  
  A single photo plus its associated metadata in the database.  
  - Table: `images`.  
  - Key fields: `id`, `user_id`, `file_url`, `latitude`, `longitude`, `created_at`, (optional) direction/bearing, project reference, metadata.

- **Location / Coordinates**  
  The latitude and longitude representing where the photo was taken or is anchored on the map.  
  - Stored as numeric fields in `images`.  
  - Used for all spatial queries and map rendering.

- **EXIF Coordinates**  
  The original latitude and longitude embedded in the image file’s EXIF metadata.  
  - Parsed on upload (when available).  
  - Must be stored in a way that is never overwritten (see invariants).

- **Corrected Coordinates**  
  Updated latitude and longitude after a user drags a marker to fix small errors.  
  - Stored separately from EXIF values.  
  - Used for display and spatial search once present.

- **Timestamp / Capture Time**  
  Time the image was taken (from EXIF if possible) or uploaded.  
  - Used in timeline filtering and ordering of results.

- **Camera Direction / Bearing**  
  Approximate direction in which the camera was pointing when the photo was taken.  
  - Used for directional relevance calculations.  
  - Optional; if missing, image is treated as direction-neutral.

- **Directional Relevance**  
  Whether an image is considered relevant given a viewer’s position and facing direction.  
  - Depends on distance (e.g., 50m radius) and bearing tolerance (e.g., ±30°).

---

## Project & Metadata

- **Project**  
  A logical grouping of images that belong to the same construction job, site, or contract.  
  - Used to filter and organize photos across time and space.

- **Metadata Key**  
  A user-defined property name attached to an image, such as “Fang”, “Türe”, “Material”.  
  - Represents a dimension along which images can be searched or filtered.

- **Metadata Value**  
  The concrete value assigned to a metadata key for a given image.  
  - Example: key `Material`, value `Beton`.

---

## Security & Access

- **Row-Level Security (RLS)**  
  PostgreSQL mechanism that restricts which rows a given authenticated user can see or modify.  
  - Enforces ownership and role-based access in tables such as `images`.

- **JWT (JSON Web Token)**  
  Token issued by Supabase upon login.  
  - Used by the frontend to authenticate requests.  
  - Interpreted by PostgreSQL RLS and Supabase to apply policies.

---

## Usage Notes

- Prefer these terms in code, UI, and docs to avoid ambiguity.
- When introducing a new domain concept, add it here and link to the relevant table or module.

