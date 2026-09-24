---
id: STUDY-020
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

# Signup is an invite trigger, not a widget

**Written:** 2026-09-24. **On:** `cursor/addable-apps-change-plan-cb0a`, by reading `handle_new_user()` in `20260616085726_invite_signups_display_name.sql`. No database was queried. **Status `proposed`.** Not permission to change the trigger.

STUDY-017’s current record says a person can create an account without an invite, and that the Organization widget is where they set the organization up. This study measures the trigger that runs today.

## What the trigger does

`handle_new_user()` is `security definer`. On insert into `auth.users` it reads `raw_user_meta_data->>'invite_token_hash'`. If that value is null it raises `Invite code is required for registration.` `[A]` `supabase/migrations/20260616085726_invite_signups_display_name.sql` lines 49–53.

When the hash matches an active, unexpired `qr_invites` row, it inserts one `profiles` row whose `organization_id` is `v_invite.organization_id` `[A]` lines 71–77. It then assigns `user_roles` from that invite’s `target_role`, or the org’s default role if the named role is missing `[A]` lines 79–88.

There is no other `INSERT` into `organizations` in application code. The inserts in this repo are seed SQL `[A]` STUDY-017, which cites `supabase/migrations/20260303000006_seed.sql` and `scripts/local-verify/seed-rls-actors.sql`. This study did not re-scan those files; the citation stands in 017.

`profiles.organization_id` cannot be null `[A]` `20260303000002_tables.sql` line 15. A trigger that inserted a profile without an organization would fail that constraint. `[C]` not executed.

## What is fragile

The Organization widget cannot be the thing that creates the first organization while this trigger still rejects a user who has no invite. The widget runs after login. Login needs a profile. The profile needs an organization. The organization, today, arrives only through the invite. `[A]` for each of those steps. `[C]` that the cycle is why “add the Organization widget, then create the company” cannot ship on the current trigger.

An invite-less path has to be a new branch of this trigger, or a replacement, in a migration. It must still:

- create exactly one profile for `new.id`
- leave `user_org_id()` returning one uuid once the person has entered an organization (STUDY-018)
- not let the browser insert `organizations` or `profiles` on its own `[A]` the trigger is `security definer`; the client is untrusted

Turning Map or Media off does not belong in this function. A new signup’s Map and Media install `[D]` STUDY-017 is a later install row. Putting that list inside `handle_new_user()` couples registration to the widget catalog. `[D]` keep them apart until a spec says the trigger writes install rows.

Existing people keep Projects, Colleagues, and Organization unless the organization turned them off `[D]` STUDY-017. This trigger does not run for them. A backfill must not reuse “new signup gets Map and Media only” as the rule for rows that already exist. `[D]`

## What this study does not do

It does not design the founder path, the invite path, or the install backfill. Those need a spec before SQL. The spec has to show the invite-less registration failing on the current function, then passing on the new one, and a second test that an existing profile is not rewritten into Map-and-Media-only.
