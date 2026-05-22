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

/** Returns the next card-variant option in toolbar toggle order (wraps). */
/** @see docs/specs/ui/workspace/workspace-pane.md */
export function getNextCardVariantToggleOption<T extends { id: string }>(
  options: ReadonlyArray<T>,
  currentId: string,
): T | null {
  if (options.length === 0) return null;
  const currentIndex = options.findIndex((opt) => opt.id === currentId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;
  return options[nextIndex] ?? options[0];
}

/** Builds aria-label/title for the compact single-button card-variant cycle control. */
/** @see docs/specs/ui/workspace/workspace-pane.md */
export function buildCompactCardVariantSwitchTitle(
  t: (key: string, fallback: string) => string,
  next: { label: string } | null,
): string {
  if (!next) return t('workspace.toolbar.size.compact.switchTo.fallback', 'Switch view');
  const template = t('workspace.toolbar.size.compact.switchTo', 'Switch to {{view}}');
  return template.replace('{{view}}', next.label);
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
