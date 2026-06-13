import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { RecentsProvider } from './recents.provider';

describe('RecentsProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [RecentsProvider] });
  });

  it('persists and deduplicates recent searches', () => {
    const provider = TestBed.inject(RecentsProvider);
    provider.addRecentSearch('Zurich');
    provider.addRecentSearch('Bern');
    provider.addRecentSearch('zurich');

    const recents = provider.getRecentSearches(5);
    expect(recents.length).toBe(2);
    expect(recents[0].label).toBe('zurich');
  });

  it('persists secondaryLabel alongside primary label', () => {
    const provider = TestBed.inject(RecentsProvider);
    provider.addRecentSearch('Fahrafeld 4', undefined, undefined, '3071 Kasten bei Böheimkirchen · Austria');

    const recents = provider.loadRecentSearches();
    expect(recents[0]?.label).toBe('Fahrafeld 4');
    expect(recents[0]?.secondaryLabel).toBe('3071 Kasten bei Böheimkirchen · Austria');
  });

  it('persists coordinates for address recents', () => {
    const provider = TestBed.inject(RecentsProvider);
    provider.addRecentSearch('Fahrafeld 4', undefined, undefined, '3071 Kasten bei Böheimkirchen · Austria', {
      lat: 48.1,
      lng: 15.6,
    });

    const recents = provider.loadRecentSearches();
    expect(recents[0]?.lat).toBe(48.1);
    expect(recents[0]?.lng).toBe(15.6);
  });
});
