import { HlmButtonDirective } from './hlm-button.directive';
import { HlmTwoStepConfirmDirective } from './hlm-two-step-confirm.directive';

export { buttonVariants, type ButtonIconPlacementCva, type ButtonVariants } from './button-variants';
export { HlmButtonDirective };
export { HlmTwoStepConfirmDirective };
export {
  TWO_STEP_CONFIRM_REVERT_MS,
  TwoStepConfirmGroup,
  TwoStepConfirmInteraction,
} from './destructive-confirm.interaction';

export const HLM_BUTTON_IMPORTS = [HlmButtonDirective, HlmTwoStepConfirmDirective] as const;
