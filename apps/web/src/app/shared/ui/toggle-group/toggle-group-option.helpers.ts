import type { ToggleValue } from '@spartan-ng/brain/toggle-group';

import type { ToggleGroupOption } from './toggle-group-option.types';

/** Normalizes BrnToggleGroup `valueChange` payloads to a single string or null. */
/** @see docs/MIGRATION_PLAN.md */
export function toggleSingleStringValue(raw: ToggleValue<string>): string | null {
  if (Array.isArray(raw)) {
    return null;
  }
  return raw === undefined ? null : raw;
}

/** Derives how an option should render (icons vs label) from explicit type or icon presence. */
/** @see docs/MIGRATION_PLAN.md */
export function toggleOptionLayout(
  option: ToggleGroupOption,
): 'text-only' | 'icon-only' | 'icon-with-text' {
  if (option.type) return option.type;
  if (option.icon && option.label) return 'icon-with-text';
  if (option.icon) return 'icon-only';
  return 'text-only';
}
