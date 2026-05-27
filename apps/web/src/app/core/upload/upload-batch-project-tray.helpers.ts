/**
 * Batch-once project address tray (Step 2).
 * @see docs/specs/component/upload/upload-resolver-tray.stepper-fsm.supplement.md
 */

import type { UploadJob } from './upload-manager.types';
import type { ProjectLocationRow } from './adapters/upload-project-locations.adapter';

export type ProjectAddressTrayScenario = 'a' | 'b' | null;

export function detectProjectAddressTrayScenario(
  jobs: readonly UploadJob[],
  projectLocations: readonly ProjectLocationRow[],
): ProjectAddressTrayScenario {
  if (!projectLocations.length) {
    return null;
  }
  const projectId = jobs[0]?.projectId;
  if (!projectId || jobs.some((j) => j.projectId !== projectId)) {
    return null;
  }
  const anyGrouping = jobs.some((j) => !!j.groupingKey && !!j.titleAddress?.trim());
  if (!anyGrouping) {
    return 'a';
  }
  return 'b';
}
