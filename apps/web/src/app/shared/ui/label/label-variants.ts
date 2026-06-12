// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-label-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * shadcn-style label typography for form fields (pairs with disabled controls via `peer`).
 * @see docs/MIGRATION_PLAN.md
 */
export const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  { variants: {}, defaultVariants: {} },
);

export type LabelVariants = VariantProps<typeof labelVariants>;
