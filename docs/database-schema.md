# Database Schema Documentation

**Who this is for:** engineers and DBAs working on data modeling, queries, and RLS policies.  
**What you'll get:** the core tables, relationships, and constraints that support GeoSite invariants.

See also: `project-description.md`, `architecture.md`, `security-boundaries.md`, `glossary.md`, and `decisions.md`.

Database: PostgreSQL (Supabase)

---

## 1. Identity Layer

Table: `auth.users` (managed by Supabase)

Fields (simplified):

- `id` (uuid)
- `email`
- `encrypted_password`
- `created_at`

**Rules**

- Application code must **not** modify this table directly.
- All changes go through Supabase Auth APIs.

---

## 2. Profiles Table

Table: `profiles`

Purpose:

- Extend the user with application-specific data.

Columns:

- `id` (uuid, primary key, references `auth.users(id)` ON DELETE CASCADE)
- `full_name` (text)
- `company` (text)
- `created_at` (timestamptz default `now()`)

Relationship:

- 1:1 with `auth.users`.

**Invariant**

- Every `auth.users` row must have exactly one `profiles` row (see `user-lifecycle.md`).

---

## 3. Roles Table

Table: `roles`

Columns:

- `id` (uuid, primary key)
- `name` (text, unique, not null)

Example values:

- `admin`
- `user`
- `viewer`

---

## 4. User Roles Table

Table: `user_roles`

Columns:

- `user_id` (uuid, references `auth.users(id)` ON DELETE CASCADE)
- `role_id` (uuid, references `roles(id)` ON DELETE CASCADE)

Primary Key:

- (`user_id`, `role_id`)

Supports a many-to-many relationship:

- One user can have multiple roles.
- One role can belong to many users.

RLS policies (see `security-boundaries.md`) use `user_roles` to determine permissions.

---

## 5. Projects Table

Table: `projects`

Columns:

- `id` (uuid, primary key)
- `name` (text, not null)
- `created_by` (uuid, references `auth.users(id)` ON DELETE RESTRICT)
- `created_at` (timestamptz default `now()`)

Notes:

- Projects are grouping entities referenced by `images.project_id`.
- Access to projects is controlled by RLS (see `security-boundaries.md`).

---

## 6. Images Table

Table: `images`

Columns (simplified):

- `id` (uuid, primary key)
- `user_id` (uuid, references `auth.users(id)` ON DELETE CASCADE)
- `project_id` (uuid, nullable, references `projects(id)` ON DELETE SET NULL)
- `file_url` (text, not null)
- `exif_latitude` (numeric(9,6), nullable)
- `exif_longitude` (numeric(9,6), nullable)
- `corrected_latitude` (numeric(9,6), nullable)
- `corrected_longitude` (numeric(9,6), nullable)
- `latitude` (numeric(9,6), not null) - effective display coordinate (corrected when present, otherwise EXIF)
- `longitude` (numeric(9,6), not null) - effective display coordinate
- `captured_at` (timestamptz, nullable) - capture time from EXIF when available
- `created_at` (timestamptz default `now()`) - upload/record creation time
- `direction_degrees` (numeric(6,2), nullable)

**Invariants**

- Every image has valid spatial (lat/lng) and temporal context (`captured_at` or `created_at`).
- Ownership is enforced via `user_id` and RLS.
- EXIF and corrected coordinates are never conflated; if both exist, corrected coordinates are used for spatial queries.

---

## 7. Metadata Tables

Table: `metadata_keys`

Columns:

- `id` (uuid, primary key)
- `key_name` (text, not null)
- `created_by` (uuid, references `auth.users(id)` ON DELETE RESTRICT)
- `created_at` (timestamptz default `now()`)

Recommended uniqueness:

- `unique (created_by, key_name)` to avoid duplicate keys in the same namespace.

Table: `image_metadata`

Columns:

- `image_id` (uuid, references `images(id)` ON DELETE CASCADE)
- `metadata_key_id` (uuid, references `metadata_keys(id)` ON DELETE CASCADE)
- `value_text` (text, not null)
- `created_at` (timestamptz default `now()`)

Primary Key:

- (`image_id`, `metadata_key_id`)

---

## 8. Indexing Strategy (MVP)

Minimum indexes for predictable map/query performance:

- `images (latitude, longitude)` for viewport/bounding-box queries.
- `images (created_at desc)` for timeline windows and sorting.
- `images (project_id, created_at desc)` for project + time filters.
- `image_metadata (metadata_key_id, value_text)` for key/value filtering.
- `user_roles (user_id)` and `roles (name)` for frequent RLS role checks.

Optional (preferred once PostGIS is introduced):

- Replace lat/lng btree with a `geography(Point, 4326)` column and GiST index for distance-heavy queries.
