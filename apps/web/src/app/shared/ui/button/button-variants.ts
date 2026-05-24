import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Tailwind + shadcn-style button classes; colors resolve via tweakcn tokens (--primary, --ring, etc.).
 * Horizontal padding is locked to spacing-2 (`ps-2` / `pe-2`) for all labeled sizes; logical ps/pe keeps RTL correct.
 * @see docs/MIGRATION_PLAN.md
 */
export const buttonVariants = cva(
  // Base row: flex row + gap between icon and label; inline padding uses spacing-2 only (design kernel).
  // @see docs/design/components/action-interaction-kernel.md#button-policy
  'relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Labeled rows: symmetric `ps-2 pe-2` only (no px); `size="icon"` is square geometry without inline padding utilities.
        default: 'h-10 py-2 ps-2 pe-2',
        sm: 'h-9 rounded-md ps-2 pe-2',
        lg: 'h-11 rounded-md ps-2 pe-2',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
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
