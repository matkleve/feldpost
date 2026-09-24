export const WIDGET_IDS = ['map', 'media', 'projects', 'colleagues', 'organization'] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export interface WidgetPolicyRow {
  widgetId: WidgetId;
  allowed: boolean;
  preinstalled: boolean;
  locked: boolean;
}

export interface UserWidgetRow {
  widgetId: WidgetId;
  installed: boolean;
}
