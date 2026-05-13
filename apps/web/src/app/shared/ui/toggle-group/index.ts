// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { HlmToggleGroupDirective } from './hlm-toggle-group.directive';
import { HlmToggleGroupItemDirective } from './hlm-toggle-group-item.directive';

export { toggleGroupVariants, toggleGroupItemVariants } from './toggle-group-variants';
export type { ToggleGroupItemVariantProps } from './toggle-group-variants';
export { HlmToggleGroupDirective } from './hlm-toggle-group.directive';
export { HlmToggleGroupItemDirective } from './hlm-toggle-group-item.directive';

/** Local toggle-group helm shims (use with `BrnToggleGroupImports`). */
export const HLM_TOGGLE_GROUP_IMPORTS = [
  HlmToggleGroupDirective,
  HlmToggleGroupItemDirective,
] as const;
