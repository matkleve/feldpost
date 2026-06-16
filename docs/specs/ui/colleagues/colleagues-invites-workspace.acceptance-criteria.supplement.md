# Colleagues Invites Workspace — Acceptance Criteria

Parent: [colleagues-invites-workspace.md](./colleagues-invites-workspace.md)

- [ ] `?tab=invites` shows three columns on desktop; stacks 1→2→3 below breakpoint without horizontal scroll.
- [ ] Opening Invites auto-creates one-shot draft; default role `worker`; 7-day expiry.
- [ ] Clicking column-2 row opens edit in column 1; **Save** / **Cancel** behave as spec.
- [ ] Quick-draft one-shot never appears in column 2.
- [ ] **Save as reusable** creates a new `reusable=true` row with name and validity; does not remove or convert the one-shot draft.
- [ ] Reusable default validity: 30 days from creation when preset not changed.
- [ ] No UI path creates validity longer than **365 days**; admin has no unlimited option.
- [ ] Column 2 shows **Active links** and **Expired links** sections using `app-rail-select-list` (compact).
- [ ] Expired rows offer **Reuse** inline action; reclaim moves row to Active after Save.
- [ ] Inline actions: copy (both sections), pause (active only); mirror projects/channels list behavior.
- [ ] Paused reusable (`revoked`) blocks signup; resume works within window.
- [ ] Expired reusable blocks signup; extend flow restores within 365d cap.
- [ ] Column 3 lists one-shot acceptances and reusable `invite_signups` for current user's invites.
- [ ] **Message** opens DM with selected person.
- [ ] All strings in i18n workbench + `seed_i18n.sql`.
- [ ] `app-chip` for status; `hlmBtn` / `hlmSwitch` per registry.
- [ ] `ng build` passes; manual: Colleagues → Invites → save reusable → pause → copy → message from column 3.
