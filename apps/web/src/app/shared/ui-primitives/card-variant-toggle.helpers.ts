import type { ToggleGroupOption } from '../ui/toggle-group/toggle-group-option.types';
import type { CardVariant } from './card-variant.types';

/** Maps a card variant to its Material Icons glyph for toolbar toggles. */
/** @see docs/MIGRATION_PLAN.md */
export function iconForCardVariant(variant: CardVariant): string {
  switch (variant) {
    case 'row':
      return 'view_headline';
    case 'small':
      return 'grid_view';
    case 'medium':
      return 'apps';
    case 'large':
      return 'view_agenda';
    default:
      return 'apps';
  }
}

/** Builds toggle options for thumbnail / card layout presets with i18n labels. */
/** @see docs/MIGRATION_PLAN.md */
export function buildCardVariantToggleOptions(
  t: (key: string, fallback: string) => string,
  allowed: ReadonlyArray<CardVariant>,
  iconOnly: boolean,
): ToggleGroupOption[] {
  return allowed.map((variant) => ({
    id: variant,
    type: iconOnly ? 'icon-only' : 'icon-with-text',
    label: t(`workspace.toolbar.size.${variant}`, variant),
    icon: iconForCardVariant(variant),
    title: t(`workspace.toolbar.size.${variant}`, variant),
    ariaLabel: t(`workspace.toolbar.size.${variant}`, variant),
  }));
}
