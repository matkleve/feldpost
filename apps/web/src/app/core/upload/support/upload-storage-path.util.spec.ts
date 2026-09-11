import { describe, expect, it } from 'vitest';
import { sanitizeStorageFileExtension } from './upload-storage-path.util';

describe('sanitizeStorageFileExtension', () => {
  it('lowercases a normal extension', () => {
    expect(sanitizeStorageFileExtension('photo.JPG')).toBe('jpg');
  });

  it('strips unsafe characters from the extension', () => {
    expect(sanitizeStorageFileExtension('evil.php.jpg/../../../etc')).toBe('etc');
  });

  it('falls back when the extension is empty or unsafe', () => {
    expect(sanitizeStorageFileExtension('noextension', 'bin')).toBe('bin');
    expect(sanitizeStorageFileExtension('file.%00jpg', 'bin')).toBe('00jpg');
  });
});
