import type { WidgetCatalogEntry } from '../widgets/widgets.types';
import type { OrganizationWidgetRow } from './organization-widgets.types';

/**
 * Row for an allowed installable catalog entry. Fixed rail entries and unknown ids are null.
 * @see docs/specs/service/organization-widgets/organization-widgets.md
 */
export function installRow(
  organizationId: string,
  widgetId: string,
  entries: readonly WidgetCatalogEntry[],
): OrganizationWidgetRow | null {
  const entry = entries.find((item) => item.id === widgetId);
  if (!organizationId || !entry || !entry.allowed || entry.rail !== 'installable') {
    return null;
  }
  return { organization_id: organizationId, widget_id: widgetId };
}
