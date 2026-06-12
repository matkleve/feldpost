// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-spinner-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues

import { HlmSpinnerComponent } from './hlm-spinner.component';

export { spinnerVariants, type SpinnerVariants } from './spinner-variants';
export { HlmSpinnerComponent } from './hlm-spinner.component';

/** Local spinner atom for standalone imports. */
export const HLM_SPINNER_IMPORTS = [HlmSpinnerComponent] as const;
