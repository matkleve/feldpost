import {
  WIDGET_IDS,
  type UserWidgetRow,
  type WidgetId,
  type WidgetPolicyRow,
} from './widget-install.types';

export { WIDGET_IDS };
export type { UserWidgetRow, WidgetId, WidgetPolicyRow };

const NEW_SIGNUP_IDS: readonly WidgetId[] = ['map', 'media'];

/**
 * Which widgets the nav shows.
 * No user row means the organization preinstall, which defaults to Map and Media.
 * An explicit off stays off when preinstall is saved again. Lock keeps a preinstalled widget on.
 * @see docs/specs/system/widget-install.md
 */
export function effectiveWidgetIds(input: {
  policies: readonly WidgetPolicyRow[];
  userRows: readonly UserWidgetRow[];
}): WidgetId[] {
  const policies = new Map(input.policies.map((row) => [row.widgetId, row]));
  const userRows = new Map(input.userRows.map((row) => [row.widgetId, row]));

  return WIDGET_IDS.filter((widgetId) => {
    const policy = policies.get(widgetId) ?? {
      widgetId,
      allowed: true,
      preinstalled: NEW_SIGNUP_IDS.includes(widgetId),
      locked: false,
    };
    const userRow = userRows.get(widgetId);

    if (!policy.allowed) {
      return false;
    }

    if (userRow === undefined) {
      return policy.preinstalled;
    }

    if (userRow.installed) {
      return true;
    }

    return policy.locked && policy.preinstalled;
  });
}
