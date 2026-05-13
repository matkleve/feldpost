// TODO(spartan-v4): Replace with @spartan-ng/ui-popover-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { HlmPopoverDirective } from './hlm-popover.directive';

export { popoverVariants } from './popover-variants';
export { HlmPopoverDirective } from './hlm-popover.directive';

/** Standalone popover surface styling (local CVA hlm layer). */
export const HLM_POPOVER_IMPORTS = [HlmPopoverDirective] as const;
