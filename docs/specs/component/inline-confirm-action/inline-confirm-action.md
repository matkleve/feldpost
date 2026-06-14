# Inline Confirm Action

Two-step inline destructive control built on `hlmBtn` + `twoStepConfirm`: first click arms (icon swap), second click emits `confirmed`. Auto-disarms after 5s or outside click.

## Primitive

```html
<button hlmBtn variant="destructive" twoStepConfirm (twoStepConfirmed)="onDelete()">
  <span class="material-icons">delete</span>
</button>
```

- **Directive**: `HlmTwoStepConfirmDirective` — selector `button[hlmBtn][twoStepConfirm]`
- **FSM**: `TwoStepConfirmInteraction` in `apps/web/src/app/shared/ui/button/destructive-confirm.interaction.ts`
- **Styling**: `variant="destructive"` uses destructive wash emphasis (`button-variants.ts`); armed state via `data-two-step-state="armed"`

## Wrapper component

`app-inline-confirm-action` adds detail-row grid slots, sidebar hover-reveal, and i18n aria labels.

## Inputs (wrapper)

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `detailRowSlot` | `'r1' \| 'r2' \| null` | `null` | When set, participates in media-detail `.detail-row` grid |
| `revealOnParentHover` | `'detail-row' \| 'sidebar-row-wrap' \| null` | `null` | Hover-reveal parent class |
| `size` | `'md' \| 'sm'` | `'md'` | `sm` for compact rows (e.g. projects sidebar) |
| `tone` | `'danger' \| 'remove'` | `'remove'` | Idle emphasis |
| `idleIcon` / `armedIcon` | `string` | `close` / `delete` | Material icon ligatures |
| `initialAriaKey` / `initialAriaFallback` | `string` | required | Idle state |
| `confirmAriaKey` / `confirmAriaFallback` | `string` | `common.inlineConfirm.*` | Armed state |
| `enabled` / `disabled` | `boolean` | `true` / `false` | |

## Output

`confirmed` — emitted on second click while armed.

## Used in

- Media detail rows (`detailRowSlot`)
- Projects sidebar archived delete (`size="sm"`, `revealOnParentHover="sidebar-row-wrap"`)

## Related

- Detail-row grid contract: [`media-detail-inline-section.md`](../ui/media-detail/media-detail-inline-section.md)
- Modal alternative: [`confirm-dialog.md`](confirm-dialog/confirm-dialog.md)
