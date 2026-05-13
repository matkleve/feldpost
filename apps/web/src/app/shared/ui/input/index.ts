import { HlmInputDirective } from './hlm-input.directive';

export { inputVariants, type InputVariants } from './input-variants';
export { HlmInputDirective };

/** Barrel for native input/textarea hlm styling. */
export const HLM_INPUT_IMPORTS = [HlmInputDirective] as const;
