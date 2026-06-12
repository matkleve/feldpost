// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-card-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { HlmCardContentDirective } from './hlm-card-content.directive';
import { HlmCardDescriptionDirective } from './hlm-card-description.directive';
import { HlmCardFooterDirective } from './hlm-card-footer.directive';
import { HlmCardHeaderDirective } from './hlm-card-header.directive';
import { HlmCardTitleDirective } from './hlm-card-title.directive';
import { HlmCardDirective } from './hlm-card.directive';

export {
  cardContentVariants,
  cardDescriptionVariants,
  cardFooterVariants,
  cardHeaderVariants,
  cardTitleVariants,
  cardVariants,
  type CardContentVariants,
  type CardDescriptionVariants,
  type CardFooterVariants,
  type CardHeaderVariants,
  type CardTitleVariants,
  type CardVariants,
} from './card-variants';
export { HlmCardContentDirective } from './hlm-card-content.directive';
export { HlmCardDescriptionDirective } from './hlm-card-description.directive';
export { HlmCardFooterDirective } from './hlm-card-footer.directive';
export { HlmCardHeaderDirective } from './hlm-card-header.directive';
export { HlmCardTitleDirective } from './hlm-card-title.directive';
export { HlmCardDirective } from './hlm-card.directive';

/** Standalone card molecule directives for barrel imports. */
export const HLM_CARD_IMPORTS = [
  HlmCardDirective,
  HlmCardHeaderDirective,
  HlmCardContentDirective,
  HlmCardFooterDirective,
  HlmCardTitleDirective,
  HlmCardDescriptionDirective,
] as const;
