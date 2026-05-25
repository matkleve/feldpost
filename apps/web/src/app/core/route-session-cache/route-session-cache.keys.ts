/** Shell keys for route session cache entries. */
export const ROUTE_SESSION_SHELL_KEYS = {
  MEDIA: 'media',
  MAP: 'map',
} as const;

export type RouteSessionShellKey =
  (typeof ROUTE_SESSION_SHELL_KEYS)[keyof typeof ROUTE_SESSION_SHELL_KEYS];

/** Map has no query signature; use this sentinel for save/restore. */
export const MAP_VIEWPORT_SIGNATURE = '__viewport__';
