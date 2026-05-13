// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-tabs-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// @see docs/MIGRATION_PLAN.md

import { HlmTabsContentDirective } from './hlm-tabs-content.directive';
import { HlmTabsListDirective } from './hlm-tabs-list.directive';
import { HlmTabsTriggerDirective } from './hlm-tabs-trigger.directive';
import { HlmTabsDirective } from './hlm-tabs.directive';

export { tabsContentVariants, tabsListVariants, tabsTriggerVariants } from './tabs-variants';
export { HlmTabsContentDirective } from './hlm-tabs-content.directive';
export { HlmTabsListDirective } from './hlm-tabs-list.directive';
export { HlmTabsTriggerDirective } from './hlm-tabs-trigger.directive';
export { HlmTabsDirective } from './hlm-tabs.directive';

/** Local hlm tab surface styling; pair with `BrnTabsImports` from `@spartan-ng/brain/tabs`. */
export const HLM_TABS_IMPORTS = [
  HlmTabsDirective,
  HlmTabsListDirective,
  HlmTabsTriggerDirective,
  HlmTabsContentDirective,
] as const;
