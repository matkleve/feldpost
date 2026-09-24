---
id: STUDY-017
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Addable apps — change plan

**Written:** 2026-09-24. **On:** `cursor/addable-apps-change-plan-cb0a`, reading STUDY-016, the glossary, routes, nav, and `20260615180000_org_roles_colleagues_chat.sql`. No database was queried. **Status `proposed`.** This is not a spec and not permission to migrate.

Owner decisions this plan obeys, all `[D]`, from STUDY-016 § Update 2026-09-24:

- A widget is an addable app. Map is one, the same kind as Media.
- Install is per user. The organization may preinstall a widget or allow it.
- Address and GPS belong to the subject (a media item today). Removing Map does not delete them.

## 1. What stays shared

These are not widgets and are not copied per app. `[A]` for where they live today. `[D]` that they stay shared.

| Piece | Where it lives now | Why it stays |
| --- | --- | --- |
| Identity | `auth.users`, `AuthService` | Every app uses the same session |
| Organization | `organizations`, `profiles.organization_id`, `user_org_id()` | One org per user. RLS is the boundary |
| Roles | `user_roles.org_role_id` → `org_roles`, `has_permission(key)` | Already the grant catalog. Keys today include `org.settings.edit`, `org.roles.manage`, `org.billing.view`, `org.api_keys.manage`, `org.export` `[A]` migration `20260615180000` lines 27–31. None of them means “install a widget” |
| Subjects and places | `media_items`, `locations`, `media_item_location_links` | Map reads them. It does not own them |
| Storage | buckets `media`, `images`, `org-branding`, `chat-attachments` | Paths stay under the org folder. Signed URLs stay the read path |

A widget may call these. It must not keep a second `organization_id` and must not decide permissions in the client. `[A]` `docs/specs/system/authorization-model.md`.

## 2. What an app is in the repo

One app is one feature folder, one page spec, and one lazy route. That shape already exists `[A]`:

| Id (proposed, not stored) | Route today | Spec | Code | Owns tables? |
| --- | --- | --- | --- | --- |
| `map` | `/`, `/map` | `docs/specs/page/map-page.md` | Layout always mounts `MapShellComponent`. Outlet is `ShellRoutePlaceholderComponent` `[A]` | No. Reads `viewport_markers` / clusters and locations |
| `media` | `/media` | `docs/specs/page/media-page.md` | `features/media/` | No. Reads `media_items`, share sets |
| `projects` | `/projects` | `docs/specs/page/projects-page.md`, `projects-dashboard.md` | `features/projects/` | No. Reads `projects`, `media_projects` |
| `colleagues` | `/colleagues` | `docs/specs/page/colleagues-page.md` | `features/colleagues/` | Uses chat tables. Those tables are org data, not “the app’s private schema” |
| `organization` | `/organization` | `docs/specs/page/organization-page.md` | `features/organization/` | Uses `org_*` admin tables |

Nav is the fixed array `navItems` in `apps/web/src/app/features/nav/nav.component.ts` lines 123–129 `[A]`. There is no install registry `[A]`.

Projects-dashboard cards (activity, file types, upload timeline, storage, team) are not these apps `[A]` glossary.

`files` has a page spec and RPCs and no route `[A]` STUDY-016. It is not in the first install list.

Settings and Account are an overlay on `/{shell}/settings`, not a route of their own `[A]` `docs/specs/page/settings-routes.md`, `account-feature.md`. STUDY-015 §14 says they are canvas content `[D]` in that study. This plan does not make them widgets until question Q6 is answered.

## 3. Data rule

Uninstalling a widget hides its route and its nav row. It does not delete subject data.

| Data | Owner | Map may read it | Deleted when Map is removed |
| --- | --- | --- | --- |
| `locations` (lat, lng, `geog`, `address_label`) | The subject’s place, org-scoped | Yes | No `[D]` |
| `media_item_location_links` | Link from a media item to a place | Yes | No `[D]` |
| `media_items` | The media subject | Yes, for markers | No |
| Chat rows | Colleagues | No | Not by removing Map. What happens when Colleagues is removed is Q4 |
| `projects`, `media_projects` | Projects | No | Not by removing Map |

A later vehicle would be another subject that links to `locations`. It would not get its own latitude columns. That link table is not designed here. There is no vehicle domain in `docs/` `[A]`.

## 4. Install facts a future spec must be able to say

No table is created by this plan. The spec, when written, has to be able to answer these without a second organization id:

1. For this user, in this organization, is widget `map` installed?
2. Did the organization preinstall it (on for users who have not chosen)?
3. Did the organization allow the user to turn it on?
4. A user in org A cannot see org B’s install rows. RLS uses `user_org_id()`.
5. Turning a widget off does not run `DELETE` on `locations` or `media_items`.

Issue #258 option A (`organization_widgets` only) does not satisfy 1. Option B (a migration per widget) and option C (a Postgres schema per widget) fight `supabase/AGENTS.md`’s single migration history. This plan rejects B and C `[D]`.

The column names, the primary key, and whether “preinstall” and “allow” are two booleans or one enum are not chosen. See Q1–Q3.

Existing users need a backfill or the shell goes empty on deploy. That backfill is Q5. It is part of the migration, not a follow-up.

## 5. Phases

Each phase stops if the questions it names are still open. Sensitive work (RLS, the install migration) is red-test-first when it starts. Not in this change.

### Phase 0 — done on the previous branch

Glossary definition, schema-doc omissions, stale column claims. STUDY-016. PR #283.

### Phase 1 — this document

Change plan and the question list. No code. No migration.

### Phase 2 — spec, after the questions

Write `docs/specs/system/widget-install.md` (name not reserved; change it if a spec of that path appears). It states:

- The widget id list for the five apps above.
- The install rule from §4, with the owner’s answers to Q1–Q7 filled in.
- RLS: a user reads and writes only their install row; org preinstall/allow is written only with the permission Q2 names.
- Uninstall does not delete subject tables. Name the tables it must not touch.
- Route guard: a URL for a widget that is not installed does not render that feature. Where it sends the user is Q8.

Do not add the Angular registry or the SQL in the same commit as the first draft of the spec. Spec first.

### Phase 3 — migration

One migration, after the spec. It creates only the install tables the spec names. RLS in the same file. Backfill from Q5 in the same migration so existing orgs do not lose Map and Media on the next deploy.

`npm run verify` includes `scripts/check-rpc-param-contract.mjs`. If the spec uses RPCs, add them in this migration and do not ship the client call until `supabase db push` has been applied (`supabase/AGENTS.md` deploy order).

No vehicle table. No copy of `locations`.

### Phase 4 — nav reads the install list

Replace the hardcoded `navItems` array with a list built from installed ids. Same five routes. Icons and labels stay the i18n keys already on those rows.

Files, when this phase starts (not now):

- `apps/web/src/app/features/nav/nav.component.ts`
- a small reader next to it, calling `SupabaseService`, not the Supabase client from the component
- `docs/specs/page/` for each app, one line: hidden when not installed

The layout still always mounts `<app-map-shell>` `[A]` `authenticated-app-layout.component.html` lines 8–18. Phase 4 must not pretend the nav flag unmounts the map. That is Phase 5.

### Phase 5 — Map is mounted like the other apps

Today the map component is outside the router outlet so it can stay alive while the user is on Media. Phase 5 makes “installed” also control that mount.

This is the risky phase. Media detail and the workspace pane call into the map (zoom to a location). Those calls have to no-op or hide when Map is not installed, and they have to keep working when it is. The page specs for map and media must name that before the template changes.

Do not do Phase 5 in the same change as Phase 3.

### Phase 6 — catalog

The `+` page from issue #258 (search, cards, install). Only after Phase 4 shows the installed list. The catalog offers a widget only when the org allows it (Q1). Preinstalled widgets appear installed and are not offered as a new install.

### Not in this plan

- Renaming CSS `project-dashboard__widget`. The glossary already says that class is not the product term.
- Editing issue #258. The GitHub token cannot (`Resource not accessible by integration`, STUDY-016).
- STUDY-015’s grid, rails, and feature flag. Coordinate so the nav list and the grid rail are not two install mechanisms. Q9.
- A vehicles app. Spec and tables come after this install mechanism exists, and they link to `locations`.

## 6. Order

```text
questions answered
  → widget-install spec
    → one migration + RLS + backfill
      → nav reads installs
        → map mount follows install
          → catalog
```

Skipping to the catalog or to a vehicle table leaves the shell hardcoded and adds a second model.

## 7. Questions

Answer in the issue or on the PR. The spec in Phase 2 cannot be written until these have an answer. Where I have stated a reading, say if it is wrong.

1. **Allow and preinstall.** Can both be true? My reading: preinstall means the widget is on for users who have not chosen; allow means the user may turn it on. If the org does not allow it, the user cannot install it. Is a preinstalled widget also allowed, or can it be forced on and impossible to turn off?
2. **Who may set the org flags?** There is no `org.widgets.manage` permission `[A]`. Should this reuse `org.settings.edit`, `org.roles.manage`, or a new key? A new key is a migration and a seed of `org_permissions`.
3. **One row or two?** User install, and org preinstall/allow, can be two tables or one. I will not pick the columns until you say whether a user who turns a preinstalled widget off stays off when the org later preinstalls it again.
4. **Removing Colleagues or Organization.** Map’s removal keeps locations. If a user removes Colleagues, do chat rows stay, hide, or delete? Constitution §1: if the UI says the chat is gone, the rows have to go. If the UI says the app is only hidden, the rows stay.
5. **Backfill.** On the day this ships, is every current user treated as having Map, Media, Projects, Colleagues, and Organization installed? If not, which of the five are on?
6. **Settings and Account.** Shell chrome on every app, or widgets with their own install bit? STUDY-015 treats them as canvas content reached from the rail, not as the same list as Map and Media.
7. **Upload.** Core, always available, or a widget? The upload shell is mounted for every authenticated route today `[A]` `authenticated-app-layout.component.html`.
8. **Deep link when not installed.** User opens `/media` and Media is off. Redirect to the first installed app, show a “not installed” page, or 404?
9. **One list.** STUDY-015’s rail and this nav must not each store install state. Confirm they read the same install facts.
10. **Files.** The `/files` spec exists and the route does not. Is Files a sixth widget later, or out of this plan?

## Update 2026-09-24 — answers 1–3

The questions above stay. These answers supersede Q1–Q3 only. Q4–Q10 are still open. `[D]` unless marked `[A]`.

1. **Allow and preinstall can both be true.** A preinstalled widget can also be locked so the user cannot turn it off. `[D]`
2. **Organization is a widget.** `[D]` It is not the thing that creates the first organization. Signup does not insert `organizations`. `handle_new_user()` rejects registration without an invite and attaches the new profile to `qr_invites.organization_id` `[A]` `supabase/migrations/20260616085726_invite_signups_display_name.sql` lines 51–77. The only `INSERT` into `organizations` in this repo is seed SQL (`supabase/migrations/20260303000006_seed.sql` and `scripts/local-verify/seed-rls-actors.sql`) `[A]`. The pattern that exists is: an organization already exists, then an invite joins a user to it. A “create my company” step is not in the product.
3. **Preinstall again does not override a user who turned the widget off.** `[D]` The organization can separately push a widget to all users, and that push does turn it on again for people who had turned it off. Push is an action, not a side effect of saving the preinstall flag.

Bootstrap, which Q2 forces: the first organization and the first admin are outside the widget list. The Organization widget is the admin UI after that row exists. Making the widget itself create the organization would be a new flow. It is not designed here.

**B1.** The first organization stays outside the widget system (seed or a later founder step that is not an installable app). The Organization widget only edits an organization that already exists. Is that the split you want?

## Update 2026-09-24 — answers 4–8

Supersedes Q4–Q8 only. Q9, Q10, and B1 are still open. `[D]` unless marked `[A]`.

4. **Uninstall does not delete data.** Data is removed only when DSGVO requires that deletion, as its own action. Hiding a widget must not tell the user the rows are gone. Chat is its own widget. Its rows stay when the chat widget is removed, until that data is itself removed. Today the chat UI is the `/colleagues` route `[A]` `docs/specs/page/colleagues-page.md`. This answer splits chat off that page. It does not define a second colleagues screen.

5. **A new start has Map and Media only.** `[D]` Not Projects, Colleagues, Organization, or Chat. Phase 3’s backfill must not grant the other apps unless a later answer says existing users keep what they already use. See B2.

6. **Settings and Account stay on the shell.** `[D]` They are not widgets and have no install bit.

7. **Upload is an add-on of Media.** `[D]` It is not its own install and it is not shell chrome. It is present when Media is present. The layout still mounts `app-upload-shell` on every authenticated route `[A]` `authenticated-app-layout.component.html`. Phase 5 has to follow Media’s install, including a temporary Media session.

8. **A shared link opens a temporary widget.** `[D]` The page does not appear as a normal install. The temporary widget lasts until logout, then it is gone. It is not a durable install row. It does not bypass RLS. Share-set tokens (`resolve_share_set`) are a different door for a selection of media `[A]` `docs/specs/service/share-set/share-set-access-model.md`. This answer is about opening an app the user has not installed. How the link names the app is not specified.

**B2.** “Only Map and Media” — does that apply to people who already use Projects, Colleagues, and Organization on the day this ships, or only to accounts created after it ships?

## Update 2026-09-24 — answers 9–10

9. **Not answered.** The owner does not have the two lists in the chat. They are written here so the next answer can be yes or no. `[A]` for the quotes. `[D]` that they must be one install store is still this plan’s proposal, not an owner decision.

| List | What it is |
| --- | --- |
| Nav today | `nav.component.ts` lines 123–129: Map `/`, Media `/media`, Projects `/projects`, Colleagues `/colleagues`, Organization `/organization`. One fixed array. |
| STUDY-015 §14.2 rail | Left rail, owner sketch 2026-09-22: map, projects, media, `+`, then account, maybe Mitarbeiter, maybe Organisation, settings. That study is `proposed`. It is not built. |

There is one nav in code. The rail list is a drawing in STUDY-015. Q9 asks that a future install store feed both, so they do not each keep their own “what is installed” rows.

10. **Files is not a widget in this plan.** `[D]` The `/files` page was a mistake to treat as a product app. Do not add the route. Do not delete `docs/specs/page/files-page.md` or the folder RPCs. Whether that tree later folds into Media is undecided. Leave it warm.

## Update 2026-09-24 — account, many organizations, Organization widget

Supersedes **B1**. The earlier sentence “the first organization stays outside the widgets” is not what the owner wants. `[D]`

**Signup.** A person can create an account without an invite. The invite code is one path, not the only path. That path adds the person to an organization immediately, for whatever email they have. `[D]`

**Many organizations.** The same email can belong to more than one organization. After login the person chooses which organization to enter. `[D]`

**Main path.** The person logs in, then adds the Organization widget. That widget is where they set up the organization, name an admin, and create invites. `[D]`

**What the database does today, which cannot express this.** `[A]`

- `handle_new_user()` refuses signup when there is no invite (`20260616085726_invite_signups_display_name.sql` lines 51–53).
- The new profile gets exactly one `organization_id`, copied from that invite (same file, lines 71–77).
- `profiles.organization_id` is `not null` (`20260303000002_tables.sql`).
- RLS uses `user_org_id()`, which reads that one column (`docs/security-boundaries.md` §2.1).

A future spec has to replace “one organization on the profile” before this flow can ship. This update does not name the membership table. Widget install rows, when they exist, are per user **inside the organization they have entered**, and still must not bypass RLS.

Still not decided: Q9 (one install store for the nav and the STUDY-015 rail), B2 (whether people who already use Projects, Colleagues, and Organization keep them on day one).

## Update 2026-09-24 — Q9 and B2

9. **The right side is not decided.** `[D]` The owner does not know if widgets will sit on the right. Do not build a second install store for a right rail. STUDY-015’s right rail stays a layout sketch. The only install list this plan may store is the one that drives the left nav, until a later decision says the right side is also widgets.

**B2.** People who already use Projects, Colleagues, and Organization keep those on the day this ships. `[D]` “Only Map and Media” is the set for a new account, not a removal of apps an existing user already has. Read from the owner’s “of course” on 2026-09-24. If that reading is wrong, this paragraph is the one to correct.

Plain meaning of “new account,” added after the owner asked what that phrase means: a person who has just signed up, and has not added widgets yet, has Map and Media on the nav. Projects, Chat, and Organization are not on until that person adds them, or an invite or an organization push turns them on. It does not mean a new database, and it does not turn those apps off for someone who already has them.
