// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-form-field-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva } from 'class-variance-authority';

/** Vertical stack: label, control, optional hint/error. */
export const formFieldVariants = cva('flex w-full min-w-0 max-w-full flex-col gap-1.5');

/** Secondary helper copy under the control. */
export const formFieldHintVariants = cva('text-xs text-muted-foreground');

/** Validation / error copy under the control. */
export const formFieldErrorVariants = cva('text-xs text-destructive');
