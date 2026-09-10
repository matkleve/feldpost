import { describe, expect, it } from 'vitest';
import { makeUploadJob } from './upload-panel.test-utils.spec';
import { resolveUploadRowMenuActions } from './upload-panel-row-action-registry';
import { getIssueKind } from '../upload-phase.helpers';

describe('upload-panel-row-action-registry', () => {
  it('offers placement recovery actions for address_deferred rows', () => {
    const job = makeUploadJob({
      phase: 'missing_data',
      issueKind: 'address_deferred',
    });

    const actions = resolveUploadRowMenuActions({
      job,
      lane: 'issues',
      issueKind: getIssueKind(job),
      showOpenProject: false,
      priorityEnabled: false,
    });

    expect(actions).toContain('change_location_map');
    expect(actions).toContain('change_location_address');
    expect(actions).toContain('retry');
    expect(actions).toContain('dismiss');
  });

  it('orders open_in_media before assign_to_project on uploaded rows', () => {
    const job = makeUploadJob({
      phase: 'complete',
      mediaId: 'media-1',
      storagePath: 'path/file.jpg',
    });

    const actions = resolveUploadRowMenuActions({
      job,
      lane: 'uploaded',
      issueKind: null,
      showOpenProject: false,
      priorityEnabled: false,
    });

    expect(actions.indexOf('open_in_media')).toBeLessThan(actions.indexOf('assign_to_project'));
  });

  it('hides open_existing_media when existingMediaId is absent', () => {
    const job = makeUploadJob({
      phase: 'skipped',
      issueKind: 'duplicate_file',
    });

    const actions = resolveUploadRowMenuActions({
      job,
      lane: 'issues',
      issueKind: 'duplicate_file',
      showOpenProject: false,
      priorityEnabled: false,
    });

    expect(actions).not.toContain('open_existing_media');
    expect(actions).toContain('upload_anyway');
  });
});
