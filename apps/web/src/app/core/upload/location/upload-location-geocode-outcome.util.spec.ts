import { describe, expect, it, vi } from 'vitest';
import { patchContainmentCheckOutcome } from './upload-location-geocode-outcome.util';
import type { UploadGroupResolutionState } from '../address-resolution/upload-address-resolution.types';

describe('patchContainmentCheckOutcome', () => {
  function makeGroup(overrides: Partial<UploadGroupResolutionState> = {}): UploadGroupResolutionState {
    return {
      status: 'needsGeocode',
      groupingKey: 'at|wien|1200|wien|hauptstrasse|',
      jobIds: ['job-1'],
      searchObject: {
        country: 'AT',
        state: 'Wien',
        postcode: '1200',
        city: 'Wien',
        street: 'Hauptstrasse',
        houseNumber: null,
        staircase: null,
        door: null,
        project: null,
        sources: [],
        sourceDeviations: [],
        postcodeCandidates: [],
        uncertainFields: [],
        groupingKey: 'at|wien|1200|wien|hauptstrasse|',
        relativePath: 'AT/Wien/1200/Hauptstrasse',
        fileName: 'photo.jpg',
      },
      folderDisplayPath: 'AT/Wien/1200/Hauptstrasse',
      titleAddressLabel: 'Hauptstrasse, Wien',
      geocodeBranch: 'branch_a',
      resolvedFromAdminConflict: true,
      ...overrides,
    };
  }

  it('sets needsTray with containmentCheck and two candidates', () => {
    const orchestrator = {
      patchGroupState: vi.fn(),
    };
    const group = makeGroup();

    const result = patchContainmentCheckOutcome(
      orchestrator as never,
      'batch-1',
      group,
    );

    expect(result.status).toBe('needsTray');
    expect(result.containmentCheck).toBe(true);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates?.[0]?.id).toBe('keep-address');
    expect(result.candidates?.[1]?.id).toBe('enter-different');
    expect(orchestrator.patchGroupState).toHaveBeenCalledWith('batch-1', result);
  });

  it('includes street and city in keep-address label', () => {
    const orchestrator = { patchGroupState: vi.fn() };
    const group = makeGroup({
      searchObject: {
        ...makeGroup().searchObject,
        street: 'Kirchengasse',
        city: 'Graz',
      },
    });

    const result = patchContainmentCheckOutcome(orchestrator as never, 'b', group);

    expect(result.candidates?.[0]?.addressLabel).toBe('Keep: Kirchengasse, Graz');
  });

  it('handles missing street gracefully', () => {
    const orchestrator = { patchGroupState: vi.fn() };
    const group = makeGroup({
      searchObject: {
        ...makeGroup().searchObject,
        street: null,
        city: 'Wien',
      },
    });

    const result = patchContainmentCheckOutcome(orchestrator as never, 'b', group);

    expect(result.candidates?.[0]?.addressLabel).toBe('Keep: , Wien');
    expect(result.status).toBe('needsTray');
  });

  it('handles missing city gracefully', () => {
    const orchestrator = { patchGroupState: vi.fn() };
    const group = makeGroup({
      searchObject: {
        ...makeGroup().searchObject,
        street: 'Hauptstrasse',
        city: null,
      },
    });

    const result = patchContainmentCheckOutcome(orchestrator as never, 'b', group);

    expect(result.candidates?.[0]?.addressLabel).toBe('Keep: Hauptstrasse,');
    expect(result.trayStep).toBe('3');
  });

  it('preserves original group fields like geocodeBranch and jobIds', () => {
    const orchestrator = { patchGroupState: vi.fn() };
    const group = makeGroup({ jobIds: ['j1', 'j2', 'j3'], geocodeBranch: 'branch_a' });

    const result = patchContainmentCheckOutcome(orchestrator as never, 'b', group);

    expect(result.jobIds).toEqual(['j1', 'j2', 'j3']);
    expect(result.geocodeBranch).toBe('branch_a');
  });

  it('sets trayStep to 3', () => {
    const orchestrator = { patchGroupState: vi.fn() };
    const result = patchContainmentCheckOutcome(orchestrator as never, 'b', makeGroup());
    expect(result.trayStep).toBe('3');
  });
});
