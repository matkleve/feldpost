/** Where a widget may sit. `unplaced` has no rail container yet. */
export type WidgetPlacement = 'top' | 'bottom' | 'panel' | 'both' | 'unplaced';

/** `fixed` is already on the rail. `installable` waits for the organization install table. */
export type WidgetRail = 'fixed' | 'installable';

export interface WidgetCatalogEntry {
  id: string;
  nameKey: string;
  nameFallback: string;
  summaryKey: string;
  summaryFallback: string;
  bodyKey: string;
  bodyFallback: string;
  placement: WidgetPlacement;
  rail: WidgetRail;
  /** False when the organization is not allowed to add it. None are false yet. */
  allowed: boolean;
}
