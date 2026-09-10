import { environment } from '../../../environments/environment';

/**
 * Dev-only toggles for upload shell / resolver tray QA.
 * Set `dockAlwaysVisible` to false before merge or release.
 */

/** Edit these; `UPLOAD_DEV_FLAGS` below is what code actually reads. */
const RAW_DEV_FLAGS = {
  /** Map + /media: frosted dock and resolver tray stay visible (passive line when idle). */
  dockAlwaysVisible: false,
  /** Seed orchestrator with fixture bundle (no real upload). */
  mockResolverTray: false,
};

export const UPLOAD_DEV_FLAGS = {
  dockAlwaysVisible: RAW_DEV_FLAGS.dockAlwaysVisible,
  /**
   * Forced false in production builds regardless of the raw value above.
   * `environment.production` is a statically-known boolean per build
   * configuration (angular.json fileReplacements), so a stray `true` left in
   * RAW_DEV_FLAGS can no longer seed fixture data in a production bundle —
   * this used to be one constant edit away from shipping.
   * @see docs/audits/upload-process-analysis-2026-09-08/06-health.md § 4
   */
  mockResolverTray: !environment.production && RAW_DEV_FLAGS.mockResolverTray,
} as const;
