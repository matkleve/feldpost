// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-skeleton-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues

import { HlmSkeletonDirective } from './hlm-skeleton.directive';

export { skeletonVariants } from './skeleton-variants';
export { HlmSkeletonDirective } from './hlm-skeleton.directive';

/** Local skeleton atom for standalone imports. */
export const HLM_SKELETON_IMPORTS = [HlmSkeletonDirective] as const;
