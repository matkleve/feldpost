import type { WidgetCatalogEntry } from './widgets.types';

export const WIDGET_CATALOG_IDS = [
  'map',
  'projects',
  'media',
  'workers',
  'organisation',
  'vehicles',
  'boats',
  'material',
  'storage-locations',
  'buildings',
] as const;

export function findWidget(
  entries: readonly WidgetCatalogEntry[],
  id: string,
): WidgetCatalogEntry | null {
  return entries.find((entry) => entry.id === id) ?? null;
}

/** Fixed rail entries read as on the rail. Installable entries are not added until #270. */
export function overviewState(entry: WidgetCatalogEntry): 'on-rail' | 'not-added' {
  return entry.rail === 'fixed' ? 'on-rail' : 'not-added';
}

/** Add installs only an allowed installable widget, and only once the install table exists. */
export function addInstalls(entry: WidgetCatalogEntry, installTableReady = false): boolean {
  return entry.allowed && entry.rail === 'installable' && installTableReady;
}
