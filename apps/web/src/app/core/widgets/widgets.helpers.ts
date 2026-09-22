import type { WidgetCatalogEntry } from './widgets.types';

export const WIDGET_PERMISSION_ACTIONS = ['open', 'view', 'create', 'edit', 'delete'] as const;

export type WidgetPermissionAction = (typeof WIDGET_PERMISSION_ACTIONS)[number];

/** Role key on org_permissions. has_permission is the check. */
export function widgetPermissionKey(widgetId: string, action: WidgetPermissionAction): string {
  return `widget.${widgetId}.${action}`;
}

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

/** Fixed rail entries read as on the rail. Installable entries stay not-added until the rail reads installs. */
export function overviewState(entry: WidgetCatalogEntry): 'on-rail' | 'not-added' {
  return entry.rail === 'fixed' ? 'on-rail' : 'not-added';
}

/** Add installs only an allowed installable widget, and only once the install table exists. */
export function addInstalls(entry: WidgetCatalogEntry, installTableReady = false): boolean {
  return entry.allowed && entry.rail === 'installable' && installTableReady;
}
