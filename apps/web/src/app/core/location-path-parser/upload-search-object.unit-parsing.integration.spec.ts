import { describe, expect, it } from 'vitest';
import { buildSearchObjectFromRelativePath } from './upload-search-object.builder';

const geo = {
  states: [{ n: 'Wien', a: ['vienna'] }],
  municipalities: [{ n: 'Wien', b: 'Wien', a: ['vienna'] }],
};

describe('buildSearchObjectFromRelativePath AT units', () => {
  it('EX-09: slash top on folder segment', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/Neustiftgasse 25/14/photo.jpg',
      'photo.jpg',
      geo,
    );
    expect(so.country).toBe('AT');
    expect(so.houseNumber).toBe('25');
    expect(so.door).toBe('14');
    expect(so.groupingKey).toContain('neustiftgasse');
    expect(so.groupingKey).not.toContain('14');
  });

  it('EX-10: Tür on folder sets door on SO', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/Neustiftgasse 11 Tür 12/photo.jpg',
      'photo.jpg',
      geo,
    );
    expect(so.door).toBe('12');
    expect(so.street?.toLowerCase()).toContain('neustiftgasse');
  });
});
