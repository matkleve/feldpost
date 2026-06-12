# Settings Section Registry

> **Parent:** [settings-overlay.md](settings-overlay.md)

## What It Is

Extension contract for Settings Overlay sections. Replaces ad-hoc hardcoded section-id allowlists with a registry that supports **visibility policies** (all members vs org admin only).

## Section Definition

```typescript
type SettingsSectionVisibility = 'all-members' | 'admin-only';

interface SettingsSectionRegistryEntry {
  id: string;
  icon: string;
  titleKey: string;
  titleFallback: string;
  subtitleKey: string;
  subtitleFallback: string;
  visibility: SettingsSectionVisibility;
}
```

## Visibility Rules

| Policy | Rail list | Detail panel |
| --- | --- | --- |
| `all-members` | Visible to every authenticated org member | Rendered when selected |
| `admin-only` | Visible only when `UserProfileService` reports role `admin` | Rendered when selected |
| (non-admin) | **Absent** — not disabled, not hidden behind lock | N/A |

## Composition Contract

1. `buildSettingsSectionRegistry(t, context)` returns full registry (static metadata).
2. `filterSettingsSectionsForViewer(registry, isOrgAdmin)` returns rail-visible entries.
3. `isKnownSettingsSectionId(id, registry)` replaces duplicated string allowlists in `SettingsOverlayComponent.selectSection`.
4. New admin sections (e.g. `search-tuning`) register once in registry; no new `@switch` case required for rail allowlist.

## Admin Role Source

`isOrgAdmin` is derived from `UserProfileService.getOwnProfile()` → `roles` includes `'admin'`. Aligns with RLS `is_admin()` on server.

## Search Tuning Attachment

- Section id: `search-tuning`
- visibility: `admin-only`
- Detail: `SearchTuningSettingsSection` component (replaces legacy user-facing `search` bias/radius placeholders for org tuning).

## Acceptance Criteria

- [ ] Adding an admin-only section requires registry entry + detail `@case` only (no third allowlist copy).
- [ ] Non-admin users never see `search-tuning` in section rail.
- [ ] `selectSection` rejects unknown ids not in filtered registry.
