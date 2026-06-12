// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-toast-helm (or Sonner stack) once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Neutral toast surface baseline; severity is expressed via item SCSS (indicator dot).
 * @see docs/specs/service/toast/toast-system.md
 */
export const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-[length:var(--radius-lg)] border border-border bg-card p-3 text-foreground shadow-md transition-all',
  {
    variants: {
      variant: {
        default: '',
        success: '',
        error: '',
        warning: '',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type ToastVariants = VariantProps<typeof toastVariants>;

/** Semantic accent tokens for toast severity indicators (SCSS / templates). */
export const toastAccentByVariant: Record<
  NonNullable<ToastVariants['variant']>,
  string
> = {
  default: 'var(--primary)',
  success: 'var(--success)',
  error: 'var(--destructive)',
  warning: 'var(--warning)',
};
