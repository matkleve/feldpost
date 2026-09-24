---
id: STUDY-023
type: review
status: proposed
supersedes: none
corrected-by: none
---

# Use cases for addable apps — what the branch covers

**Written:** 2026-09-24. **On:** `cursor/addable-apps-change-plan-cb0a`. **How:** a second agent read the plan scenes, the install and account migrations through `20260924190000_share_copy_keeps_media.sql`, and the nav, receive, join, and chat screens. Nothing was executed against a database. **Status `proposed`.** This does not change STUDY-025.

Three scenes are covered. Twenty-four are partial. Four are missing. The partial ones are the product: the screen exists, and a second path still does the old thing.

## Do this differently

These are design corrections, not missing buttons. `[D]` until the owner accepts them. The measurements under each one are `[A]`.

**1. One column is the organization on screen.** `set_account_context` writes `profiles.organization_id` and `active_organization_id` together. `[A]` `20260924130000_account_context.sql`. `accept_organization_invite` writes only `active_organization_id`. `[A]` `20260924170000_share_links_invite_join.sql`. `user_org_id()` reads `active_organization_id`. `[A]` the same account-context migration. `push_organization_widget` still selects `profiles.organization_id`. `[A]` `20260924120000_widget_install.sql`. Membership should live in `account_memberships`. Switching should change `active_organization_id` only.

**2. Permission follows the organization on screen.** `has_permission` is true when any of the person’s roles, in any organization, has the key. `[A]` `20260615180000_org_roles_colleagues_chat.sql`. An admin of organization A can change organization B’s apps after a switch. The check has to join the role’s organization to `user_org_id()`.

**3. Copy is a new photo. Shared is a receipt.** Copy mode inserts a new project and then links the source `media_item_id`. `[A]` `20260924190000_share_copy_keeps_media.sql`. The sender’s later edit is the same row. `projects: shared read` matches any receipt for the user, with no context check. `[A]` `20260924150000_context_widgets_share_chat.sql`. A copy needs its own media row and file. A shared project stays labeled and does not become a normal project of the organization on screen.

**4. One install bit owns nav, route, upload, and map actions.** `effectiveWidgetIds` filters the nav. `[A]` `nav.component.ts`. The routes still load Media, Projects, Colleagues, and Organization. `[A]` `authenticated-app.routes.ts`. Upload is always mounted. `[A]` `authenticated-app-layout.component.html`. Zoom stops when Map is off. `[A]` `map-zoom-orchestrator.service.ts`. Placement still navigates to `/map`. A hidden app should not render. A link that opens it for this visit should be a session grant, not an install row.

**5. Personal context is a write target, and caches include it.** `find_or_create_location` raises `not_found` when `user_org_id()` is null. `[A]` `20260910140000_upload_address_precision.sql`. A self-employed person cannot save an address. `setContext` does not clear the project list cache. Switching should drop cached project and media lists, and every write that still requires an organization has to accept the personal context.

## Coverage

| Id | Scene | Verdict |
| --- | --- | --- |
| UC-01 | Sign up with no invite and work alone | partial — profile can be null; saving a place still requires an organization |
| UC-02 | Create an organization; old data stays put | covered |
| UC-03 | Invite joins immediately; personal rows stay | partial — signup and `/join` differ on which profile column they write |
| UC-04 | Switch organization; the app list follows | partial — the switch works; the project cache does not |
| UC-05 | New account sees Map and Media | partial — true on an empty read; a failed read shows all five |
| UC-06 | Allow, preinstall, lock, push | partial — the flags work; push misses members whose `profiles.organization_id` is elsewhere |
| UC-07 | Hide removes the nav row; data stays | partial — the route and upload stay |
| UC-08 | A link opens a hidden app and does not install it | partial — the route opens; there is no visit grant |
| UC-09 | Partner copies a project or keeps it shared | partial — the token and the two buttons exist; the list does not label the receipt |
| UC-10 | Chat is not Colleagues | partial — `/chat` is separate; organization chat is unchanged |
| UC-11 | Settings and Account stay on the shell; Upload belongs to Media; Files is not an app | partial — Files is absent; Upload ignores the Media install bit |
| UC-12 | The five-app backfill is not a product rule | partial — new signups skip it; the migration still inserts it |
| UC-13 | Two organizations, separate rows | partial — membership and the switcher exist; permissions do not follow the switch |
| UC-14 | Leave an organization | missing |
| UC-15 | A locked app cannot be hidden | partial — the server refuses; the Hide button still shows |
| UC-16 | Push turns an app back on; saving preinstall does not | partial — the split is in the helper; push’s member query is the old column |
| UC-17 | Photos taken before the organization stay personal | covered |
| UC-18 | Partner has not added Projects and can still choose | partial — `/projects/receive` is outside the install list |
| UC-19 | A withdrawn project link fails | missing |
| UC-20 | A copy edits a new photo; a shared project stays live and read-only | partial — the partner cannot update the row, and the row is still the sender’s |
| UC-21 | A message to an unknown email fails | covered as a refusal — `send_account_message` raises `recipient not found` |
| UC-22 | An expired invite fails | partial — the server rejects it; the screen does not say it expired |
| UC-23 | Switch organization while an upload is running | missing |
| UC-24 | Hide Map, then zoom from Media | partial — zoom stops; placement still opens `/map` |
| UC-25 | Open `/media` after hiding Media | missing — the route has no install guard |
| UC-26 | No Colleagues without an organization | partial — the nav hides it; the route loads |
| UC-27 | A member cannot change app policy | partial — the section is permission-gated; the permission is not limited to this organization |
| UC-28 | Delete the account; personal files go; organization files stay | partial — `delete_own_account` deletes the auth user; personal media rows remain with `created_by` set null |
| UC-29 | “Add to my projects” lands in the context on screen | partial — the insert uses `user_org_id()`; the screen does not say which context that is |
| UC-30 | A shared project stays shared after a switch | partial — the receipt is visible in every context |
| UC-31 | The install read fails | partial — the fallback is all five apps, including for a personal account |

UC-14, UC-19, UC-23, and UC-25 are the holes with no path. UC-25 is the same hole as the route half of UC-07 and UC-26: the nav and the URL do not share one rule.
