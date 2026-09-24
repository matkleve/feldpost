---
id: STUDY-022
type: comparison
status: proposed
supersedes: none
corrected-by: none
---

# Ways to implement addable apps

**Written:** 2026-09-24. **On:** `cursor/addable-apps-change-plan-cb0a`, after the two-table migration. The owner asked how many implementation architectures were actually compared. **Status `proposed`.** This does not revoke `docs/specs/system/widget-install.md`.

## What was checked before the migration

Four, and then one was built. `[A]` STUDY-016 and STUDY-017.

| Way | Where it was named | What happened |
| --- | --- | --- |
| Static `navItems` array | The code, and STUDY-016 pattern 2 | Rejected once install had to survive a reload per user. |
| `organization_widgets` only (issue #258 option A) | STUDY-016, STUDY-017 §4 | Rejected. One org row cannot record “this user turned it off.” |
| A migration bundle per widget (option B) | STUDY-016 pattern 5 | Rejected. Fights one migration history in `supabase/AGENTS.md`. |
| A Postgres schema per widget (option C) | STUDY-016 pattern 5 | Rejected for the same reason, and it splits RLS. |

The two tables in `20260924120000_widget_install.sql` were not on that list. They were picked while closing the spec. These other shapes, which also fit the owner’s rules, were not compared first.

## Shapes that were not compared

Each one can hide a nav row without deleting `locations` or `media_items`. They differ in who can override whom, and in what a later multi-organization change has to rewrite.

1. **One row per user per widget, org flags copied onto that row.** Preinstall, allow, lock, and the user’s on/off bit live together. Push is an update of those rows. Fewer joins. Saving preinstall again is easy to implement as “overwrite the user bit,” which is the bug the owner forbade. The two-table split exists to make that overwrite a different statement from push.

2. **A `jsonb` list on `profiles` and another on `organizations`.** No new tables. RLS is the profile and organization policies that already exist. A widget id is a key inside a document. You cannot put a foreign key on an id. A push rewrites every profile document in the org. Backfill is a blob update. This is the smallest migration and the hardest one to constrain.

3. **Organization row plus “exceptions only” for users.** The org row says the default. A user row exists only after that person turns a widget off or on. New signups store nothing and read the org default (Map and Media). This is close to what `effectiveWidgetIds` already does when the user has no rows. The migration did not do it. It inserted an explicit on-row for every existing profile and all five ids, which is shape 1’s backfill sitting on shape 3’s reader.

4. **Nav filter only, routes always registered.** This is what shipped. `[A]` `nav.component.ts` filters `installedIds`. The route still opens. Map stays mounted. `[A]` STUDY-019. Install is a label. Deep links do not expire. STUDY-021 §4.

5. **The same store, plus a route guard, plus unmounting the map.** Same tables. Different behavior. An uninstalled URL does not render the feature. Map unmounts only after Media’s zoom has a no-op. `[D]` STUDY-017 Phase 5. This was named as a later phase and not weighed as a different architecture. It is the same data with a different boundary. The boundary is the part the owner can see.

6. **Browser-only list** (`localStorage` or a session set). No migration. The organization cannot preinstall, lock, or push, and another device does not see the choice. It fails the owner’s org rules. `[D]` STUDY-017. It is listed so it is not “discovered” later as a shortcut.

The repo folder, page spec, and lazy route are not a sixth install design. They are how an app is added to the build. `[A]` STUDY-016 pattern 1. Every row above can use that shape. None of them requires a schema per app.

## What the built shape costs

`organization_widget_policies` plus `user_widget_installs`, writes through two functions, nav reads `effectiveWidgetIds`. `[A]` the migration and `widget-install.helpers.ts`.

- It can express “preinstall again does not undo a user’s off” and “push does,” because those are different writes. Shapes 2 and 6 cannot do that cleanly. Shape 1 can, if the update statements stay distinct.
- It cannot express “the URL is gone after logout.” Shape 5 can, with the same rows.
- It keys every row to `user_org_id()`. A later choice of organization rewrites these rows. Shape 2 on `profiles` has the same problem. Waiting to create the tables does not, and that wait was not held. `[A]` STUDY-021 §6.

## Recommendation

Keep one shared database and one migration history. `[D]` That rejection of options B and C still holds.

Do not add a third store. If the nav label is not enough, the next change is shape 5 on these tables: guard the route, and leave the map mounted until the zoom no-op is specified. Do not replace the tables with a `jsonb` blob or a schema per app to get that behavior.

If several organizations per email are next, stop extending these tables until STUDY-018 says which single organization the session has entered. More columns on `user_widget_installs` will be re-keyed with the rest.
