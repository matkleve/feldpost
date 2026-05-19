// TODO(spartan-v4): Replace with @spartan-ng/ui-menu-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { HlmMenuContentDirective } from './hlm-menu-content.directive';
import { HlmMenuItemDirective } from './hlm-menu-item.directive';
import { HlmMenuLabelDirective } from './hlm-menu-label.directive';
import { HlmMenuSeparatorDirective } from './hlm-menu-separator.directive';

export {
  OPTION_MENU_ITEM_CLASS,
  OPTION_MENU_ITEM_ICON_CLASS,
  OPTION_MENU_LABEL_CLASS,
  menuContentVariants,
  menuItemVariants,
  menuLabelVariants,
  menuSeparatorVariants,
} from './menu-variants';
export { HlmMenuContentDirective } from './hlm-menu-content.directive';
export { HlmMenuItemDirective } from './hlm-menu-item.directive';
export { HlmMenuLabelDirective } from './hlm-menu-label.directive';
export { HlmMenuSeparatorDirective } from './hlm-menu-separator.directive';

/** Local hlm menu styling directives (brain has no BrnMenu yet). */
export const HLM_MENU_IMPORTS = [
  HlmMenuContentDirective,
  HlmMenuItemDirective,
  HlmMenuSeparatorDirective,
  HlmMenuLabelDirective,
] as const;
