// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { HlmPillToggleDirective } from './hlm-pill-toggle.directive';
import { HlmToggleGroupDirective } from './hlm-toggle-group.directive';
import { HlmToggleGroupItemDirective } from './hlm-toggle-group-item.directive';

export {
  pillToggleSizeStyle,
  pillToggleVariants,
  toggleGroupVariants,
  toggleGroupItemVariants,
} from './toggle-group-variants';
export type { PillToggleVariantProps, PillToggleSize, ToggleGroupItemVariantProps } from './toggle-group-variants';
export { HlmPillToggleDirective } from './hlm-pill-toggle.directive';
export { HlmToggleGroupDirective } from './hlm-toggle-group.directive';
export { HlmToggleGroupItemDirective } from './hlm-toggle-group-item.directive';

export type { ToggleGroupOption } from './toggle-group-option.types';
export { toggleOptionLayout, toggleSingleStringValue } from './toggle-group-option.helpers';

/** Local toggle-group helm shims (use with `BrnToggleGroupImports`). */
export const HLM_TOGGLE_GROUP_IMPORTS = [
  HlmPillToggleDirective,
  HlmToggleGroupDirective,
  HlmToggleGroupItemDirective,
] as const;
