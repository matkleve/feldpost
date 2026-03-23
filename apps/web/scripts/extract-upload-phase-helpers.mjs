import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const panelPath = path.join(root, 'src/app/features/upload/upload-panel.component.ts');
const helperPath = path.join(root, 'src/app/features/upload/upload-phase.helpers.ts');

const panel = fs.readFileSync(panelPath, 'utf8');
const marker = 'private static readonly PHASE_TO_STATUS_CLASS: Record<UploadPhase, string> = ';
const markerIndex = panel.indexOf(marker);
if (markerIndex === -1) {
  throw new Error('Could not find PHASE_TO_STATUS_CLASS marker in upload-panel.component.ts');
}

const objectStart = panel.indexOf('{', markerIndex);
const objectEnd = panel.indexOf('\n  };', objectStart);
if (objectStart === -1 || objectEnd === -1) {
  throw new Error('Could not parse PHASE_TO_STATUS_CLASS object literal');
}

const mapLiteral = panel.slice(objectStart, objectEnd + 4);

const helperContent = `import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';

export type UploadLane = 'uploading' | 'uploaded' | 'issues';

export const PHASE_TO_STATUS_CLASS: Record<UploadPhase, string> = ${mapLiteral};

export function phaseToStatusClass(phase: UploadPhase): string {
  return PHASE_TO_STATUS_CLASS[phase];
}

export function getLaneForJob(job: UploadJob): UploadLane {
  if (job.phase === 'complete' || job.phase === 'skipped') return 'uploaded';
  if (job.phase === 'error' || job.phase === 'missing_data') return 'issues';
  return 'uploading';
}
`;

fs.writeFileSync(helperPath, helperContent, 'utf8');
console.log('Wrote', path.relative(root, helperPath));
