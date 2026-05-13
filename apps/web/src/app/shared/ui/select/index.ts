// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-select-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { HlmSelectDirective } from './hlm-select.directive';

export { selectVariants, type SelectVariants } from './select-variants';
export { HlmSelectDirective } from './hlm-select.directive';

/** Standalone native select directive for barrel imports. */
export const HLM_SELECT_IMPORTS = [HlmSelectDirective] as const;
