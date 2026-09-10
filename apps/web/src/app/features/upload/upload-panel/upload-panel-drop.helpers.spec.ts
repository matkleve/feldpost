import { describe, expect, it } from 'vitest';
import { scanFilesFromWebkitDirectory } from '../../../core/folder-scan/folder-scan-from-file-list.helpers';

describe('upload-panel-drop.helpers integration with folder scan', () => {
  it('scanFilesFromWebkitDirectory preserves directory segments from relative paths', () => {
    const file = new File(['x'], 'photo.jpg');
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: 'ProjectA/sub/photo.jpg',
    });

    const { entries, rootFolderLabel } = scanFilesFromWebkitDirectory([file]);
    expect(rootFolderLabel).toBe('ProjectA');
    expect(entries[0]?.directorySegments).toEqual(['ProjectA', 'sub']);
  });
});
