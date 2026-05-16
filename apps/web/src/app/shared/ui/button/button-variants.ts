import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Tailwind + shadcn-style button classes; colors resolve via tweakcn tokens (--primary, --ring, etc.).
 * @see docs/MIGRATION_PLAN.md
 */
export const buttonVariants = cva(
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
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
    // Outline + sm: override `sm` horizontal padding to **spacing-2** (8px / `px-2`), not `px-3`.
    // twMerge keeps a single `px-*` on the host. Matches toolbar trigger `padding-inline: var(--spacing-2)`.
    // @see docs/migration/reports/padding-and-hit-area-audit-2026-05-16.md
    compoundVariants: [
      {
        variant: 'outline',
        size: 'sm',
        class: 'px-2',
      },
    ],
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
