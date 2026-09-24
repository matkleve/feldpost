---
id: STUDY-021
type: review
status: proposed
supersedes: none
corrected-by: none
---

# The addable-app decisions were recorded and not challenged

**Written:** 2026-09-24. **On:** `cursor/addable-apps-change-plan-cb0a`, after STUDY-024, STUDY-025, STUDY-026, STUDY-027, and STUDY-020 and `20260924120000_widget_install.sql`. The owner said the studies had not critiqued the decisions. This file is that critique. **Status `proposed`.** It does not revoke the spec.

STUDY-024, STUDY-025, STUDY-026, STUDY-027, and STUDY-020 grade owner sentences as `[D]` and measure the code those sentences hit. They do not say where a decision cannot be true, or where a later commit dropped one. That is the gap.

## 1. “Unless the organization turned them off” has no input

The decision says existing apps stay, and come off only if the organization turned them off. `[D]` STUDY-025 current record.

There was no install store before `20260924120000_widget_install.sql`. An organization could not have turned an app off. The migration inserts `installed = true` for every existing profile and all five ids. `[A]` that file, the `insert into public.user_widget_installs` statement.

On ship day the exception does nothing. Every current person gets every current app. The sentence sounds like a safeguard. It is a backfill of “all on.”

## 2. The Organization widget cannot be the start of an organization

The decision says a person signs up without an invite, logs in, adds the Organization widget, and creates the organization there. The same email may belong to several organizations. `[D]` STUDY-025 current record.

`handle_new_user()` refuses a signup with no invite and writes that invite’s organization onto the profile. `profiles.organization_id` is `not null`. `[A]` STUDY-020. A widget runs after login. Login needs a profile. The profile needs an organization. The decision’s order cannot run on this trigger.

Recording that as “out of scope” left the decision looking settled. It is not settled. One of these has to move: invite-less signup, “the widget creates the first organization,” or “a profile already has an organization before any widget is added.”

## 3. “Per user” loses to lock and push

Install is per user. The organization may also lock a widget on, and a push turns it back on for people who turned it off. `[D]` STUDY-025 current record.

Those two org actions mean the user’s off switch is not final. That can be the right product. It was written down as if “per user” and “the org can force it” were the same idea. They are not. The org is the authority. The user bit is a preference the org can override. The spec should say that in one sentence, or drop lock and push.

## 4. Map is not a widget yet, and a deep link does not expire

Map is supposed to be the same kind of module as Media. `[D]` STUDY-024. The layout still always contains `app-map-shell`. `[A]` STUDY-027. The nav hides a row. The route is still there. Uninstall, so far, is a label.

A shared link was supposed to open a widget until logout and then be gone. `[D]` STUDY-025. The spec now says opening the path does not write a row. `[A]` `docs/specs/system/widget-install.md` Actions row 8. Nothing blocks the route, before logout or after. Hiding the nav row is not “gone after logout.” The URL still opens the page.

## 5. Chat as its own widget was dropped

Chat is its own widget, and its rows stay when it is removed. `[D]` STUDY-025. The migration’s widget check list is `map`, `media`, `projects`, `colleagues`, `organization`. `[A]` `20260924120000_widget_install.sql`. There is no `chat` id. Colleagues remains the chat screen.

That was a scope cut during implementation, not an owner change. The open question is still: if one of those two is installed and the other is not, what does `/colleagues` show? Shipping “colleagues includes chat” answers it by erasure.

## 6. Install rows make several organizations more expensive

`user_widget_installs.organization_id` is the profile’s one organization, enforced with `user_org_id()`. `[A]` the migration’s policies. STUDY-026 says several organizations per email have to keep that helper returning one uuid.

Adding the install tables first means a later membership change has to re-key every install row, or the session’s chosen organization has to overwrite `profiles.organization_id` and the install rows follow that one column. Either way the tables just added are part of the migration they were supposed to wait for. Building them now did not make STUDY-026 smaller.

## What still holds

Uninstall must not delete subject rows. Settings and Account are not widgets. Files is not a widget in this plan. The map must not be destroyed until Media’s zoom has a defined no-op. Those do not conflict with the code that was measured.
