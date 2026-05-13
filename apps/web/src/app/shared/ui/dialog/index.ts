// TODO(spartan-v4): Replace with @spartan-ng/ui-dialog-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { HlmDialogContentDirective } from './hlm-dialog-content.directive';
import { HlmDialogDescriptionDirective } from './hlm-dialog-description.directive';
import { HlmDialogFooterDirective } from './hlm-dialog-footer.directive';
import { HlmDialogHeaderDirective } from './hlm-dialog-header.directive';
import { HlmDialogOverlayDirective } from './hlm-dialog-overlay.directive';
import { HlmDialogTitleDirective } from './hlm-dialog-title.directive';

export {
  dialogContentVariants,
  dialogDescriptionVariants,
  dialogFooterVariants,
  dialogHeaderVariants,
  dialogOverlayVariants,
  dialogTitleVariants,
} from './dialog-variants';
export { HlmDialogContentDirective } from './hlm-dialog-content.directive';
export { HlmDialogDescriptionDirective } from './hlm-dialog-description.directive';
export { HlmDialogFooterDirective } from './hlm-dialog-footer.directive';
export { HlmDialogHeaderDirective } from './hlm-dialog-header.directive';
export { HlmDialogOverlayDirective } from './hlm-dialog-overlay.directive';
export { HlmDialogTitleDirective } from './hlm-dialog-title.directive';

/** Standalone dialog styling directives (local CVA hlm layer). */
export const HLM_DIALOG_IMPORTS = [
  HlmDialogOverlayDirective,
  HlmDialogContentDirective,
  HlmDialogHeaderDirective,
  HlmDialogFooterDirective,
  HlmDialogTitleDirective,
  HlmDialogDescriptionDirective,
] as const;
