import { describe, expect, it } from 'vitest';
import { FilenameParserService } from './filename-parser.service';

describe('FilenameParserService', () => {
  const service = new FilenameParserService();

  it('extracts address from Wienzeile-style filename with high confidence (street suffix)', () => {
    const parsed = service.extractAddress('Linke Wienzeile 26, Wien_0327.jpg');
    expect(parsed).toEqual({ address: 'Linke Wienzeile 26, Wien', confidence: 'high' });
  });

  it('extracts address from Strasse filename with high confidence (street suffix)', () => {
    const parsed = service.extractAddress('Arsenalstrasse 3, Wien_000123.jpeg');
    expect(parsed).toEqual({ address: 'Arsenalstrasse 3, Wien', confidence: 'high' });
  });

  it('returns undefined for camera-generated filename', () => {
    const parsed = service.extractAddress('20240822_000000_IMG_0054.jpg');
    expect(parsed).toBeUndefined();
  });

  it('extracts address via fallback pattern with low confidence (no street suffix)', () => {
    const parsed = service.extractAddress('Fahrafeld 4.jpg');
    expect(parsed).toEqual({ address: 'Fahrafeld 4', confidence: 'low' });
  });

  it('rejects generic non-address filename words in fallback path', () => {
    const parsed = service.extractAddress('Photo 4.jpg');
    expect(parsed).toBeUndefined();
  });
});
