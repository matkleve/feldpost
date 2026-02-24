# Security Boundaries Documentation

**Who this is for:** engineers and operators responsible for keeping GeoSite’s data secure.  
**What you’ll get:** the trust model, RLS boundaries, and storage rules that must never be violated.

See also: `database-schema.md`, `user-lifecycle.md`, `architecture.md`, and `decisions.md` (D2).

---

## 1. Authentication Boundary

- All access requires a valid Supabase JWT.
- Supabase verifies the token before any database access.
- The frontend is never trusted for identity validation.

**Invariant**

- Only authenticated requests (with valid JWT) can reach RLS‑protected tables.

---

## 2. Authorization Boundary

- Authorization is enforced via Row-Level Security (RLS) in PostgreSQL.
- The frontend does **not** decide permissions; it only displays what the database allows.
- RLS policies use:
  - `auth.uid()` for the current user.
  - `user_roles` and `roles` tables for role checks.

**Invariant**

- Any new table containing user‑ or project‑scoped data must ship with RLS policies before it is used.

---

## 3. Row-Level Security Policies

### Images Table

Conceptual policy:

- **SELECT** – A user can view:
  - Images where `user_id = auth.uid()`, or
  - Images if the user has role `admin`.

- **INSERT** – Allowed only if `user_id = auth.uid()`.

- **UPDATE** – Allowed only if:
  - `user_id = auth.uid()`, or
  - User has role `admin`.

- **DELETE** – Same rule as UPDATE.

### Role Check Logic (Conceptual)

A user is considered `admin` if:

```sql
exists (
  select 1
  from user_roles ur
  join roles r on r.id = ur.role_id
  where ur.user_id = auth.uid()
    and r.name = 'admin'
);
```

---

## 4. Storage Security

- Images are stored in Supabase Storage.

Policy (conceptual):

- Users can upload only into their own folder / namespace.
- File naming uses UUIDs to avoid collisions and information leaks.
- Public vs signed access is determined by explicit storage policies:
  - MVP can choose conservative defaults (e.g., signed URLs).

---

## 5. Trust Model

**Trusted:**

- Supabase Auth (for identity).
- PostgreSQL with RLS (for authorization and data integrity).

**Untrusted:**

- Browser.
- Angular frontend.
- Any client-side logic.

**Implication**

- Client-side checks are for UX only.  
  Security and access control must always be implemented and tested at the database/policy level.
