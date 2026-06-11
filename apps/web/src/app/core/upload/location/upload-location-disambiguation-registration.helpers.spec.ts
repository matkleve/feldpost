import { describe, expect, it } from 'vitest';
import { mergeDisambiguationGroupPatch } from './upload-location-disambiguation-registration.helpers';
import type { UploadDisambiguationGroup } from '../upload-manager.types';

const adminConflicts = [
  {
    field: 'city' as const,
    entries: [
      { level: 2, value: 'Wien', source: 'folder' as const, field: 'state' as const },
      { level: 1, value: 'Innsbruck', source: 'folder' as const, field: 'city' as const },
    ],
  },
];

function baseGroup(overrides: Partial<UploadDisambiguationGroup> = {}): UploadDisambiguationGroup {
  return {
    id: 'group-1',
    batchId: 'batch-1',
    queryKey: 'adminConflict|city|innsbruck,wien',
    folderDisplayPath: 'Innsbruck',
    titleAddress: 'Innsbruck',
    jobIds: ['job-a'],
    candidates: [{ id: 'c-1', addressLabel: 'Level 1: Innsbruck (city)', lat: 0, lng: 0 }],
    collapseStage: 'per_file',
    resolutionStatus: 'pending',
    resolutionGateOpen: true,
    disambiguationKind: 'admin_level_conflict',
    adminLevelConflicts: adminConflicts,
    ...overrides,
  };
}

describe('mergeDisambiguationGroupPatch', () => {
  it('merges jobIds when a second job registers with the same admin conflict queryKey', () => {
    const merged = mergeDisambiguationGroupPatch(baseGroup(), {
      batchId: 'batch-1',
      queryKey: 'adminConflict|city|innsbruck,wien',
      folderDisplayPath: 'Innsbruck',
      titleAddress: 'Innsbruck',
      jobIds: ['job-b'],
      candidates: [],
      disambiguationKind: 'admin_level_conflict',
      adminLevelConflicts: adminConflicts,
    });

    expect(merged.jobIds.sort()).toEqual(['job-a', 'job-b']);
    expect(merged.disambiguationKind).toBe('admin_level_conflict');
    expect(merged.adminLevelConflicts).toEqual(adminConflicts);
  });

  it('deduplicates jobIds when the same job registers twice', () => {
    const merged = mergeDisambiguationGroupPatch(baseGroup(), {
      batchId: 'batch-1',
      queryKey: baseGroup().queryKey,
      folderDisplayPath: 'Innsbruck',
      titleAddress: 'Innsbruck',
      jobIds: ['job-a', 'job-b'],
      candidates: [],
    });

    expect(merged.jobIds.sort()).toEqual(['job-a', 'job-b']);
  });

  it('keeps existing candidates when the patch supplies an empty candidate list', () => {
    const merged = mergeDisambiguationGroupPatch(baseGroup(), {
      batchId: 'batch-1',
      queryKey: baseGroup().queryKey,
      folderDisplayPath: 'Innsbruck',
      titleAddress: 'Innsbruck',
      jobIds: ['job-b'],
      candidates: [],
    });

    expect(merged.candidates).toHaveLength(1);
    expect(merged.candidates[0]!.id).toBe('c-1');
  });

  it('preserves adminLevelConflicts when the patch omits them', () => {
    const merged = mergeDisambiguationGroupPatch(baseGroup(), {
      batchId: 'batch-1',
      queryKey: baseGroup().queryKey,
      folderDisplayPath: 'Innsbruck',
      titleAddress: 'Innsbruck',
      jobIds: ['job-b'],
      candidates: [],
    });

    expect(merged.adminLevelConflicts).toEqual(adminConflicts);
  });
});
