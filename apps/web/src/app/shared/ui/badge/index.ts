import { HlmBadgeDirective } from './hlm-badge.directive';

export { badgeVariants, type BadgeVariants } from './badge-variants';
export { HlmBadgeDirective };

/** Standalone badge directive for barrel imports. */
export const HLM_BADGE_IMPORTS = [HlmBadgeDirective] as const;
