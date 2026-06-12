// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-popover-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva } from 'class-variance-authority';

// Floating popover shell — position and anchor are owner's responsibility
// @see docs/specs/component/filters/dropdown-system.md
export const popoverVariants = cva(
  'rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-md outline-none',
);
