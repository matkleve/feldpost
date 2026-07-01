import { cva, type VariantProps } from 'class-variance-authority';

/** Quiet control hover/focus/active — gold invitation ink + wash (@see docs/design/state-visuals.md § Interaction emphasis). */
const quietInteractionEmphasis =
  'text-muted-foreground hover:bg-[color:color-mix(in_srgb,var(--brand-gold)_10%,transparent)] hover:text-[color:var(--brand-gold)] focus-visible:bg-[color:color-mix(in_srgb,var(--brand-gold)_10%,transparent)] focus-visible:text-[color:var(--brand-gold)] active:bg-[color:color-mix(in_srgb,var(--brand-gold)_15%,transparent)] active:text-[color:var(--brand-gold)] [&_.material-icons]:text-inherit';

/** Outline quiet control — bordered rest + gold-tinted border on hover. */
const outlineInteractionEmphasis = `border border-input bg-background hover:border-[color:color-mix(in_srgb,var(--brand-gold)_42%,var(--border))] focus-visible:border-[color:color-mix(in_srgb,var(--brand-gold)_42%,var(--border))] ${quietInteractionEmphasis}`;

/** Destructive quiet control — destructive ink + wash (@see docs/design/state-visuals.md § Interaction emphasis). */
const destructiveInteractionEmphasis =
  'text-destructive bg-[color:color-mix(in_srgb,var(--destructive)_10%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--destructive)_15%,transparent)] hover:text-destructive focus-visible:bg-[color:color-mix(in_srgb,var(--destructive)_15%,transparent)] focus-visible:text-destructive active:bg-[color:color-mix(in_srgb,var(--destructive)_18%,transparent)] active:text-destructive';

/**
 * Tailwind + shadcn-style button classes; colors resolve via tweakcn tokens (--primary, --ring, etc.).
 * Horizontal padding is locked to spacing-2 (`ps-2` / `pe-2`) for all labeled sizes; logical ps/pe keeps RTL correct.
 * @see docs/design/state-visuals.md § Interaction emphasis
 */
export const buttonVariants = cva(
  // Base row: flex row + gap between icon and label; inline padding uses spacing-2 only (design kernel).
  // @see docs/design/components/action-interaction-kernel.md#button-policy
  'relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium leading-none ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_.material-icons]:inline-flex [&_.material-icons]:shrink-0 [&_.material-icons]:leading-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: destructiveInteractionEmphasis,
        outline: outlineInteractionEmphasis,
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: quietInteractionEmphasis,
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Labeled rows: symmetric `ps-2 pe-2` only (no px); `size="icon"` is square geometry without inline padding utilities.
        default: 'h-10 py-2 ps-2 pe-2 [&_.material-icons]:text-lg',
        // Rail-row fit: h-8 (2rem) matches the `normal` rail row height; padding stays spacing-2.
        xs: 'h-8 rounded-md ps-2 pe-2 [&_.material-icons]:text-lg',
        sm: 'h-9 rounded-md ps-2 pe-2 [&_.material-icons]:text-lg',
        lg: 'h-11 rounded-md ps-2 pe-2 [&_.material-icons]:text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-xs': 'h-6 w-6',
        'icon-md': 'h-9 w-9',
      },
      // Semantic hook for icon+label rows; horizontal padding stays spacing-2 for every placement (kernel lock).
      iconPlacement: {
        balanced: '',
        iconStart: '',
        iconEnd: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      iconPlacement: 'balanced',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

/** CVA keys for iconPlacement (directive maps user start/end to these). */
export type ButtonIconPlacementCva = NonNullable<ButtonVariants['iconPlacement']>;
