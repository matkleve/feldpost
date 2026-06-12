/** Single option in a pill-style toggle group (text, icon, or both). */
/** @see docs/MIGRATION_PLAN.md */
export interface ToggleGroupOption {
  id: string;
  label: string;
  icon?: string;
  type?: 'text-only' | 'icon-only' | 'icon-with-text';
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  inactive?: boolean;
  attention?: boolean;
  /** Error-tone label/icon when set (e.g. Issues lane with jobs); hover uses light destructive fill at callsite. */
  destructiveHint?: boolean;
}
