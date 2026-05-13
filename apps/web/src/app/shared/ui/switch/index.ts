// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-switch-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues

import { HlmSwitchDirective, HlmSwitchThumbDirective } from './hlm-switch.directive';

export {
  switchLegacyShimTrackVariants,
  switchThumbVariants,
  switchVariants,
  toggleRowVariants,
  type ToggleRowVariants,
} from './switch-variants';
export { HlmSwitchDirective, HlmSwitchThumbDirective } from './hlm-switch.directive';

/** Local switch atom + thumb for standalone imports. */
export const HLM_SWITCH_IMPORTS = [HlmSwitchDirective, HlmSwitchThumbDirective] as const;
