import { describe, expect, it } from 'vitest';
import { resolveOriginalFilePathParts } from './media-detail-view.utils';

/**
 * "Original folder" reads the folder the file actually arrived with.
 * @see docs/specs/system/deferred-location-resolution.md
 */
describe('resolveOriginalFilePathParts', () => {
  it('reads the folder from relative_path, which is where it actually lives', () => {
    const parts = resolveOriginalFilePathParts('Wien/Thalistraße 4/IMG_001.jpg', 'IMG_001.jpg');

    expect(parts.folder).toBe('Wien/Thalistraße 4');
    expect(parts.filename).toBe('IMG_001.jpg');
  });

  it('shows no folder for a directory upload when relative_path is absent', () => {
    // The regression this guards: original_filename is a leaf name, so splitting it invented
    // nothing for a folder upload — and invented a folder whenever a name contained a slash.
    const parts = resolveOriginalFilePathParts(null, 'IMG_001.jpg');

    expect(parts.folder).toBeNull();
    expect(parts.filename).toBe('IMG_001.jpg');
  });

  it('falls back to original_filename for rows uploaded before relative_path was read', () => {
    const parts = resolveOriginalFilePathParts(null, 'Graz/Annenstraße 10/foto.jpg');

    expect(parts.folder).toBe('Graz/Annenstraße 10');
    expect(parts.filename).toBe('foto.jpg');
  });

  it('prefers relative_path over a filename that also looks like a path', () => {
    const parts = resolveOriginalFilePathParts('Wien/Kirchengasse 11/a.jpg', 'Graz/other/a.jpg');

    expect(parts.folder).toBe('Wien/Kirchengasse 11');
  });

  it('normalizes backslashes so a Windows export reads the same', () => {
    const parts = resolveOriginalFilePathParts('Wien\\Kirchengasse 11\\a.jpg', null);

    expect(parts.folder).toBe('Wien/Kirchengasse 11');
    expect(parts.filename).toBe('a.jpg');
  });

  it('returns nothing when neither column carries anything', () => {
    const parts = resolveOriginalFilePathParts(null, null);

    expect(parts.folder).toBeNull();
    expect(parts.filename).toBeNull();
  });
});
