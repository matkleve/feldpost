# Database Schema Documentation

**Who this is for:** engineers and DBAs working on data modeling, queries, and RLS policies.  
**What you’ll get:** the core tables, relationships, and constraints that support GeoSite’s invariants.

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

## 5. Images Table

Table: `images`

Columns (simplified):

- `id` (uuid, primary key)
- `user_id` (uuid, references `auth.users(id)` ON DELETE CASCADE)
- `file_url` (text, not null)
- `latitude` (numeric(9,6), not null) – canonical spatial coordinate (may be corrected).
- `longitude` (numeric(9,6), not null)
- `created_at` (timestamptz default `now()`)
- (Optional) EXIF latitude/longitude fields, if modeled separately.
- (Optional) direction/bearing.
- (Optional) project and metadata linkage (see `features.md` / `glossary.md`).

**Invariants**

- Every image has valid spatial (lat/lng) and temporal (`created_at`) data.
- Ownership is enforced via `user_id` and RLS.
- EXIF vs corrected coordinates are never conflated; if both exist, corrected are used for spatial queries.
