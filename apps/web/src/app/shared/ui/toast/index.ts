// TODO(spartan-v4): Replace with published @spartan-ng/ui-toast-helm when Tailwind v4 peers land.

import { HlmToastDirective } from './hlm-toast.directive';

export { toastVariants, type ToastVariants } from './toast-variants';
export { HlmToastDirective } from './hlm-toast.directive';

/** Local toast surface atom for standalone imports. */
export const HLM_TOAST_IMPORTS = [HlmToastDirective] as const;
