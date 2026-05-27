/**
 * Dev-only toggles for upload shell / resolver tray QA.
 * Set `dockAlwaysVisible` to false before merge or release.
 */
export const UPLOAD_DEV_FLAGS = {
  /** Map + /media: frosted dock and resolver tray stay visible (passive line when idle). */
  dockAlwaysVisible: false,
  /** Seed orchestrator with fixture bundle (no real upload). */
  mockResolverTray: false,
  /** Route tray through UploadResolverTrayOrchestratorService (production default). */
  useTrayOrchestrator: true,
} as const;
