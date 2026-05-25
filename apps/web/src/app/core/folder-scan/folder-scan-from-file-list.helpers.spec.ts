import { describe, expect, it } from 'vitest';
import { scanFilesFromWebkitDirectory, splitWebkitRelativePath } from './folder-scan-from-file-list.helpers';

function fileWithPath(name: string, relativePath: string): File {
  const file = new File(['x'], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
}

describe('splitWebkitRelativePath', () => {
  it('splits nested posix paths into segments and root', () => {
    expect(splitWebkitRelativePath('Folder/sub/photo.jpg')).toEqual({
      directorySegments: ['Folder', 'sub'],
      inferredRoot: 'Folder',
    });
  });

  it('normalizes windows separators', () => {
    expect(splitWebkitRelativePath('Mariahilferstraße 56\\IMG.jpg')).toEqual({
      directorySegments: [],
      inferredRoot: 'Mariahilferstraße 56',
    });
  });

  it('returns empty segments when path is missing', () => {
    expect(splitWebkitRelativePath(undefined)).toEqual({
      directorySegments: [],
      inferredRoot: undefined,
    });
  });
});

describe('scanFilesFromWebkitDirectory', () => {
  it('aggregates entries and root label from first path', () => {
    const result = scanFilesFromWebkitDirectory([
      fileWithPath('a.jpg', 'Mariahilferstraße 56/a.jpg'),
      fileWithPath('b.jpg', 'Mariahilferstraße 56/sub/b.jpg'),
    ]);

    expect(result.rootFolderLabel).toBe('Mariahilferstraße 56');
    expect(result.entries).toHaveLength(2);
    expect(result.entries[1]?.directorySegments).toEqual(['Mariahilferstraße 56', 'sub']);
  });
});
