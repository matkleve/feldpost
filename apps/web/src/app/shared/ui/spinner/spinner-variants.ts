// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-spinner-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// No `@spartan-ng/brain/spinner` entry in the current `@spartan-ng/brain` pin — local CVA until brain/spinner exists.

import { cva, type VariantProps } from 'class-variance-authority';

export const spinnerVariants = cva(
  'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;
