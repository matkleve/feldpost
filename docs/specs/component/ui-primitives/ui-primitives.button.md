# UI Primitives — Button

## What It Is

One **Button** primitive on native `<button>`: emphasis, size, layout, and loading differ only by inputs. Ghost toolbar icons are a **density preset**, not a second primitive type.

## What It Looks Like

Token borders and fills; hover/active/focus-visible; sizes `sm` / `md` / `lg`; emphasis `primary` / `secondary` / `ghost` / `danger`; layouts `default` / `icon-with-text` / `icon-only`; optional loading spinner on host.

## Where It Lives

- **Styles:** `apps/web/src/styles/primitives/button.scss`
- **Integration:** `apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts` (`uiButton*`, `uiIconButtonGhost*`)

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Click enabled button | Native click; parent handler runs |
| 2 | Focus button | Focus-visible ring per tokens |
| 3 | Activate loading state | Spinner; pointer events disabled |

## Component Hierarchy

```text
button (host)
└── projected label / icon content
```

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ----- | ----------- |
| Chrome | host `button` | parent | host | `.ui-button*` | content | modifiers match inputs |
| Loading | host (`::after`) | host | none when loading | `.ui-button--loading::after` | overlay | spinner visible |

## API (normative target)

| Input | Type | Default |
| ----- | ---- | ------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `emphasis` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'secondary'` |
| `layout` | `'default' \| 'icon-with-text' \| 'icon-only'` | `'default'` |
| `loading` | `boolean` | `false` |
| `density` | `'default' \| 'toolbar'` | `'default'` |

When `density === 'toolbar'` and `layout === 'icon-only'`, implementation MAY apply `icon-btn-ghost*` metrics until merged into `ui-button`.

## Today vs target

| Phase | Integration |
| ----- | ----------- |
| Today | Stacked directives + global SCSS |
| Target | Typed host(s) with inputs above; scoped SCSS |

## File Map

| File | Purpose |
| ---- | ------- |
| `styles/primitives/button.scss` | Canonical chrome |
| `ui-primitives.directive.ts` | Directive hosts |

## Acceptance Criteria

- [ ] No nested `<button>` inside `<button>`.
- [ ] Icon-only buttons have an accessible name (`aria-label` or visible text).
- [ ] Token-first styling (no stray hex outside tokens).
