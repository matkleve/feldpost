/**
 * Dev fixture: seeds UploadResolverTrayOrchestratorService for local QA.
 * @see upload-dev-flags.ts `mockResolverTray`
 */
import type { EnqueueTrayItemInput } from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';

export const MOCK_ORCHESTRATOR_BATCH_ID = 'dev-mock-batch';

export const UPLOAD_RESOLVER_TRAY_MOCK_ORCHESTRATOR_ITEMS: EnqueueTrayItemInput[] = [
  {
    dialogueUnitId: 'mock-unit-city-house',
    producerId: 'mock',
    batchId: MOCK_ORCHESTRATOR_BATCH_ID,
    questionKey: 'upload.resolver.question.city',
    questionParams: { street: 'Musterstrasse 12', address: 'Musterstrasse 12' },
    jobIds: ['mock-job-1', 'mock-job-2', 'mock-job-3'],
    folderDisplayPath: '2025-05 / Baustelle Nord / Fundamente',
    trayStepLabel: '1a',
    options: [
      { id: 'mock-city-bern', label: 'Bern', lat: 46.948, lng: 7.447, score: 0.92, city: 'Bern' },
      { id: 'mock-city-zurich', label: 'Zürich', lat: 47.3769, lng: 8.5417, score: 0.71, city: 'Zürich' },
      { id: 'mock-city-winterthur', label: 'Winterthur', lat: 47.3851, lng: 8.4922, score: 0.54, city: 'Winterthur' },
    ],
  },
  {
    dialogueUnitId: 'mock-unit-city-house',
    producerId: 'mock',
    batchId: MOCK_ORCHESTRATOR_BATCH_ID,
    questionKey: 'upload.resolver.question.houseStep',
    questionParams: { street: 'Musterstrasse 12', address: 'Musterstrasse 12' },
    jobIds: ['mock-job-1', 'mock-job-2', 'mock-job-3'],
    folderDisplayPath: '2025-05 / Baustelle Nord / Fundamente',
    trayStepLabel: '1b',
    dependsOnItemId: '__MOCK_1A__',
    options: [
      { id: 'mock-hn-4', label: 'Musterstrasse 4, 3018 Bern', lat: 46.9472, lng: 7.3954, score: 0.91 },
      { id: 'mock-hn-12', label: 'Musterstrasse 12, 3018 Bern', lat: 46.9481, lng: 7.3978, score: 0.88 },
    ],
  },
  {
    dialogueUnitId: 'mock-unit-source',
    producerId: 'mock',
    batchId: MOCK_ORCHESTRATOR_BATCH_ID,
    questionKey: 'upload.resolver.question.source',
    questionParams: {
      street: 'Via Roma 7',
      address: 'Via Roma 7, Milano',
      distance: '1.2 km',
    },
    jobIds: ['mock-job-4', 'mock-job-5'],
    folderDisplayPath: '2025-05 / Cantiere Sud',
    options: [
      { id: 'source-text', label: 'Via Roma 7, 20121 Milano', lat: 45.4642, lng: 9.19 },
      { id: 'source-exif', label: 'Via Garibaldi 3, 20121 Milano', lat: 45.4721, lng: 9.1853 },
      { id: 'source-both', label: 'Via Roma 7, 20121 Milano', lat: 45.4721, lng: 9.1853 },
      { id: 'source-none', label: '', lat: 45.4642, lng: 9.19 },
    ],
  },
  {
    dialogueUnitId: 'mock-unit-address',
    producerId: 'mock',
    batchId: MOCK_ORCHESTRATOR_BATCH_ID,
    questionKey: 'upload.resolver.question.address',
    questionParams: { street: 'Industriestrasse', address: 'Industriestrasse, Bern' },
    jobIds: ['mock-job-6'],
    folderDisplayPath: '2025-04 / Werkhof Ost',
    options: [
      { id: 'mock-c3-a', label: 'Industriestrasse 4, 3018 Bern', lat: 46.9472, lng: 7.3954, score: 0.88, city: 'Bern' },
      { id: 'mock-c3-b', label: 'Industriestrasse 22, 3018 Bern', lat: 46.9488, lng: 7.4012, score: 0.76, city: 'Bern' },
      { id: 'mock-c3-c', label: 'Industriestrasse, 3007 Bern', lat: 46.9398, lng: 7.4474, score: 0.61, city: 'Bern' },
    ],
  },
];

/** Resolve mock dependsOnItemId placeholder after 1A item id is known. */
export function bindMockOrchestratorDependencies(
  items: EnqueueTrayItemInput[],
  firstItemId: string,
): EnqueueTrayItemInput[] {
  return items.map((item) =>
    item.dependsOnItemId === '__MOCK_1A__'
      ? { ...item, dependsOnItemId: firstItemId }
      : item,
  );
}

export const UPLOAD_RESOLVER_TRAY_MOCK_MEDIA_NAMES: Readonly<Record<string, string>> = {
  'mock-job-1': 'Fundament_Nord_01.jpg',
  'mock-job-2': 'Fundament_Nord_02.jpg',
  'mock-job-3': 'Fundament_Nord_03.jpg',
  'mock-job-4': 'Cantiere_Sud_A.jpg',
  'mock-job-5': 'Cantiere_Sud_B.jpg',
  'mock-job-6': 'Werkhof_Ost_scan.heic',
};
