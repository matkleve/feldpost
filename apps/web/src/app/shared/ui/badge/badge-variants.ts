// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-badge-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.
//
// TODO(design-tokens): `app-chip` file-type variants (`chip--*` in `chip.component.scss`) stay on
// component SCSS until a design pass maps them to shared badge variants.

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * shadcn-style badge surface; colors resolve via tweakcn tokens.
 * @see docs/MIGRATION_PLAN.md
 */
export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border border-border bg-transparent text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        /** Status / invite chips — maps legacy `.ui-status-badge--neutral`. */
        neutral: 'border-transparent bg-muted text-muted-foreground',
        /** Semantic info (primary-tinted). */
        info: 'border-transparent bg-primary/10 text-primary',
        /** Semantic success — uses `success` color token from `tailwind.config.js`. */
        success: 'border-transparent bg-success/12 text-foreground',
        /** Semantic warning — uses `warning` color token. */
        warning: 'border-transparent bg-warning/16 text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
