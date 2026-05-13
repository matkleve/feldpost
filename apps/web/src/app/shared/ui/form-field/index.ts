// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-form-field-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { HlmFormFieldComponent } from './hlm-form-field.component';
import { HlmFormFieldErrorDirective } from './hlm-form-field-error.directive';
import { HlmFormFieldHintDirective } from './hlm-form-field-hint.directive';

export { formFieldErrorVariants, formFieldHintVariants, formFieldVariants } from './form-field-variants';
export { HlmFormFieldComponent } from './hlm-form-field.component';
export { HlmFormFieldErrorDirective } from './hlm-form-field-error.directive';
export { HlmFormFieldHintDirective } from './hlm-form-field-hint.directive';

/** Barrel for form-field composition (layout + hint/error). */
export const HLM_FORM_FIELD_IMPORTS = [
  HlmFormFieldComponent,
  HlmFormFieldHintDirective,
  HlmFormFieldErrorDirective,
] as const;
