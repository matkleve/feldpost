// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-select-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * shadcn-style surface for native `<select>` (no overlay).
 * @see docs/MIGRATION_PLAN.md
 */
export const selectVariants = cva(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer',
  {
    variants: {
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      error: {
        true: 'border-destructive focus:ring-destructive',
        false: '',
      },
    },
    defaultVariants: { size: 'md', error: false },
  },
);

export type SelectVariants = VariantProps<typeof selectVariants>;
