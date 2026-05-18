// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-toast-helm (or Sonner stack) once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Toast row surface; colors resolve via tweakcn / shadcn token names.
 * @see docs/MIGRATION_PLAN.md
 */
export const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-border p-6 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        success: 'border-success/20 bg-success/10 text-success',
        error: 'border-destructive/20 bg-destructive/10 text-destructive',
        warning: 'border-warning/20 bg-warning/10 text-warning',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type ToastVariants = VariantProps<typeof toastVariants>;
