// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-dialog-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva } from 'class-variance-authority';

// Backdrop/scrim applied to CDK backdrop via BrnDialog.setOverlayClass (not host geometry).
// @see docs/MIGRATION_PLAN.md
export const dialogOverlayVariants = cva(
  'bg-black/80 backdrop-blur-sm data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200',
);

// Panel surface inside CDK dialog overlay (positioning owned by CDK / BrnDialog).
// @see docs/MIGRATION_PLAN.md
export const dialogContentVariants = cva(
  'grid w-full max-w-lg gap-4 border border-border bg-card p-6 shadow-lg duration-200 sm:rounded-lg',
);

// Dialog header
// @see docs/MIGRATION_PLAN.md
export const dialogHeaderVariants = cva('flex flex-col space-y-1.5 text-center sm:text-left');

// Dialog footer
// @see docs/MIGRATION_PLAN.md
export const dialogFooterVariants = cva(
  'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
);

// Dialog title (use on non-heading hosts if global heading styles must stay exclusive).
// @see docs/MIGRATION_PLAN.md
export const dialogTitleVariants = cva('text-lg font-semibold leading-none tracking-tight');

// Dialog description
// @see docs/MIGRATION_PLAN.md
export const dialogDescriptionVariants = cva('text-sm text-muted-foreground');
