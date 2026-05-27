import { describe, expect, it } from 'vitest';
import { detectProjectAddressTrayScenario } from './upload-batch-project-tray.helpers';
import type { UploadJob } from './upload-manager.types';
import type { ProjectLocationRow } from './adapters/upload-project-locations.adapter';

function job(partial: Partial<UploadJob> & { id: string }): UploadJob {
  return {
    id: partial.id,
    batchId: partial.batchId ?? 'batch-1',
    file: partial.file ?? new File([], 'a.jpg'),
    phase: partial.phase ?? 'queued',
    progress: 0,
    statusLabel: '',
    submittedAt: new Date(),
    projectId: partial.projectId,
    groupingKey: partial.groupingKey,
    titleAddress: partial.titleAddress,
  } as UploadJob;
}

const loc: ProjectLocationRow = {
  linkId: 'l1',
  sortOrder: 0,
  locationId: 'loc-1',
  street: 'Mariahilfer',
  houseNumber: null,
  postcode: '1060',
  city: 'Wien',
  district: 'Mariahilf',
  country: 'AT',
  latitude: 48.19,
  longitude: 16.34,
  addressLabel: 'Mariahilf, Wien',
};

describe('detectProjectAddressTrayScenario', () => {
  it('returns null when no project locations', () => {
    expect(detectProjectAddressTrayScenario([job({ id: 'j1', projectId: 'p1' })], [])).toBe(null);
  });

  it('Scenario A when jobs have no address tokens', () => {
    expect(
      detectProjectAddressTrayScenario(
        [job({ id: 'j1', projectId: 'p1' }), job({ id: 'j2', projectId: 'p1' })],
        [loc],
      ),
    ).toBe('a');
  });

  it('Scenario B when jobs have grouping/title address', () => {
    expect(
      detectProjectAddressTrayScenario(
        [job({ id: 'j1', projectId: 'p1', groupingKey: 'k', titleAddress: 'Thaliastraße 4' })],
        [loc],
      ),
    ).toBe('b');
  });
});
