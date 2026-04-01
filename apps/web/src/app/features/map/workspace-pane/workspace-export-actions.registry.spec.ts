import { describe, expect, it } from 'vitest';
import { WORKSPACE_EXPORT_ACTION_DEFINITIONS } from './workspace-export-actions.registry';

describe('WORKSPACE_EXPORT_ACTION_DEFINITIONS', () => {
  it('contains only ws_footer actions agreed for footer', () => {
    const ids = WORKSPACE_EXPORT_ACTION_DEFINITIONS.map((action) => action.id);
    expect(ids).toEqual(['select_all', 'select_none', 'download_zip', 'share_link', 'copy_link']);
  });

  it('does not include thumbnail-only destructive actions', () => {
    const ids = WORKSPACE_EXPORT_ACTION_DEFINITIONS.map((action) => action.id);
    expect(ids).not.toContain('remove_from_project');
    expect(ids).not.toContain('delete_media');
  });
});
