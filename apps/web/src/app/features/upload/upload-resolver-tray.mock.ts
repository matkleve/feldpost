/**
 * Dev-only mock disambiguation groups for resolver tray UI QA.
 * @see upload-dev-flags.ts `mockResolverTray`
 */
import type {
  UploadAddressCandidate,
  UploadDisambiguationGroup,
} from '../../core/upload/upload-manager.types';

const MOCK_BATCH_ID = 'dev-mock-batch';

function candidate(
  id: string,
  addressLabel: string,
  lat: number,
  lng: number,
  score: number,
  city?: string,
): UploadAddressCandidate {
  return { id, addressLabel, lat, lng, score, city };
}

/** House-number options for mock Step 1B (after city confirm on carousel card 1). */
export const UPLOAD_RESOLVER_TRAY_MOCK_1B_CANDIDATES: UploadAddressCandidate[] = [
  candidate('mock-hn-4', 'Musterstrasse 4, 3018 Bern', 46.9472, 7.3954, 0.91, 'Bern'),
  candidate('mock-hn-12', 'Musterstrasse 12, 3018 Bern', 46.9481, 7.3978, 0.88, 'Bern'),
  candidate('mock-hn-22', 'Musterstrasse 22, 3018 Bern', 46.9495, 7.4015, 0.74, 'Bern'),
];

/**
 * Three open groups — carousel + step 1A/1B on card 1 (branch C style).
 * Use arrow keys or chevrons: `1A/3` → `2/3` → `3/3`; confirm city on card 1 → `1B/3`.
 */
export const UPLOAD_RESOLVER_TRAY_MOCK_GROUPS: UploadDisambiguationGroup[] = [
  {
    id: 'mock-resolver-group-1a',
    batchId: MOCK_BATCH_ID,
    queryKey: 'musterstrasse-12-bern',
    folderDisplayPath: '2025-05 / Baustelle Nord / Fundamente',
    titleAddress: 'Musterstrasse 12',
    jobIds: ['mock-job-1', 'mock-job-2', 'mock-job-3'],
    collapseStage: 'partial',
    resolutionStatus: 'pending',
    resolutionGateOpen: true,
    disambiguationKind: 'city_step',
    trayStep: '1a',
    step1bGate: 'disabled',
    confirmedCity: null,
    candidates: [],
  },
  {
    id: 'mock-resolver-group-2',
    batchId: MOCK_BATCH_ID,
    queryKey: 'via-roma-7-milano',
    folderDisplayPath: '2025-05 / Cantiere Sud',
    titleAddress: 'Via Roma 7, Milano',
    jobIds: ['mock-job-4', 'mock-job-5'],
    collapseStage: 'per_file',
    resolutionStatus: 'pending',
    resolutionGateOpen: true,
    disambiguationKind: 'source',
    candidates: [
      candidate(
        'mock-c2-folder',
        'Via Roma 7, 20121 Milano (from folder name)',
        45.4642,
        9.19,
        1,
      ),
      candidate(
        'mock-c2-exif',
        'Via Garibaldi 3, 20121 Milano (from photo GPS)',
        45.4721,
        9.1853,
        1,
      ),
    ],
  },
  {
    id: 'mock-resolver-group-3',
    batchId: MOCK_BATCH_ID,
    queryKey: 'industriestrasse-bern',
    folderDisplayPath: '2025-04 / Werkhof Ost',
    titleAddress: 'Industriestrasse, Bern',
    jobIds: ['mock-job-6'],
    collapseStage: 'partial',
    resolutionStatus: 'pending',
    resolutionGateOpen: true,
    disambiguationKind: 'geocode',
    trayStep: '3',
    localityHint: 'Bern',
    candidates: [
      candidate('mock-c3-a', 'Industriestrasse 4, 3018 Bern', 46.9472, 7.3954, 0.88, 'Bern'),
      candidate('mock-c3-b', 'Industriestrasse 22, 3018 Bern', 46.9488, 7.4012, 0.76, 'Bern'),
      candidate('mock-c3-c', 'Industriestrasse, 3007 Bern', 46.9398, 7.4474, 0.61, 'Bern'),
      candidate('mock-c3-d', 'Industriestrasse, 3322 Urtenen-Schönbühl', 47.0211, 7.4981, 0.42),
    ],
  },
];

/** Display names for mock affected-media chip dropdown. */
export const UPLOAD_RESOLVER_TRAY_MOCK_MEDIA_NAMES: Readonly<Record<string, string>> = {
  'mock-job-1': 'Fundament_Nord_01.jpg',
  'mock-job-2': 'Fundament_Nord_02.jpg',
  'mock-job-3': 'Fundament_Nord_03.jpg',
  'mock-job-4': 'Cantiere_Sud_A.jpg',
  'mock-job-5': 'Cantiere_Sud_B.jpg',
  'mock-job-6': 'Werkhof_Ost_scan.heic',
};
