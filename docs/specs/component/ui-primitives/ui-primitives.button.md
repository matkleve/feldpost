# UI Primitives — Button (`hlmBtn`)

## What It Is

Native `<button>` / `<a>` styling via **`hlmBtn`** directive and **`buttonVariants`** CVA ([`button-variants.ts`](../../../../apps/web/src/app/shared/ui/button/button-variants.ts)). One primitive; behavior differs by `variant` and `size` inputs only.

## What It Looks Like

Token borders and fills from tweakcn semantics (`--primary`, `--border`, `--muted-foreground`, …). Quiet variants follow **Interaction emphasis** ([`state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis). Commit actions use solid primary or destructive fills.

| `variant` | Rest | Hover / focus | Selected / on (when applicable) |
| --------- | ---- | ------------- | -------------------------------- |
| `default` | Solid `--primary`, light foreground | Darker primary (`primary/90`) | — |
| `destructive` | Solid destructive | Darker destructive | — |
| `outline` | Muted text, border, background | Primary ink + 10% primary wash | Selected ink via host state / parent (not CVA alone) |
| `ghost` | Muted text, transparent | Same as outline hover | Same as outline |
| `secondary` | Solid `--secondary` (olive light) | Darker secondary | Rare — prefer `outline` for new work |
| `link` | Primary text | Underline | — |

## Where It Lives

- **CVA:** `apps/web/src/app/shared/ui/button/button-variants.ts`
- **Directive:** `apps/web/src/app/shared/ui/button/hlm-button.directive.ts`
- **Legacy:** `apps/web/src/styles/primitives/button.scss` (`ui-button`) — do not extend; migrate callsites to `hlmBtn`

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Click enabled button | Native click; parent handler runs |
| 2 | Focus button | Focus-visible ring (`--interactive-focus-ring`) + interaction emphasis hover colors on quiet variants |
| 3 | Activate loading state | `disabled:opacity-50`; no hover chrome |

## Component Hierarchy

```text
button[hlmBtn] (host)
└── projected label / icon content
```

## Interaction emphasis

- Canonical: [`docs/design/state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis
- [x] This component implements the contract (`outline`, `ghost` in CVA; `default`/`destructive` documented filled exception)

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ----- | ----------- |
| Chrome | host `button` | parent | host | `button[hlmBtn]` | content | variant classes on host |
| Quiet hover | host | host | host | `hover:` / `focus-visible:` utilities | states | primary ink + wash |
| Filled CTA | host | host | host | `bg-primary` / `bg-destructive` | states | solid fill |

## API

| Input | Type | Default |
| ----- | ---- | ------- |
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'default'` |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon' \| 'icon-sm' \| 'icon-md'` | `'default'` |
| `iconPlacement` | `'start' \| 'end'` | balanced (padding semantics) |

## File Map

| File | Purpose |
| ---- | ------- |
| `shared/ui/button/button-variants.ts` | Canonical Tailwind/CVA classes |
| `shared/ui/button/hlm-button.directive.ts` | Host directive |
| `styles/primitives/button.scss` | Legacy `ui-button` (frozen) |

## Acceptance Criteria

- [x] No nested `<button>` inside `<button>`.
- [x] Icon-only buttons have an accessible name (`aria-label` or visible text).
- [x] `outline` / `ghost` use interaction emphasis (not `--accent` hover).
- [x] `default` / `destructive` remain filled CTAs.
- [ ] All legacy `ui-button` / `btn-primary` callsites migrated to `hlmBtn` variants (see [`interaction-emphasis-rollout.md`](../../system/interaction-emphasis-rollout.md)).
