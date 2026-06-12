import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { CommandProvider } from './command.provider';

describe('CommandProvider', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CommandProvider] });
  });

  it('returns empty for non-command queries', async () => {
    const provider = TestBed.inject(CommandProvider);
    const results = await firstValueFrom(provider.search('burgstrasse', {}));
    expect(results).toEqual([]);
  });

  it('returns commands for slash-prefixed queries', async () => {
    const provider = TestBed.inject(CommandProvider);
    const results = await firstValueFrom(provider.search('/', {}));

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => item.family === 'command')).toBe(true);
    expect(results.map((item) => item.label)).toEqual(
      expect.arrayContaining(['Upload photos', 'Go to my location']),
    );
  });

  it('returns QR invite command for /image queries', async () => {
    const provider = TestBed.inject(CommandProvider);
    const results = await firstValueFrom(provider.search('/image', {}));

    expect(results).toEqual([
      {
        id: 'cmd-create-qr-invite',
        family: 'command',
        label: 'Create QR Invite',
        command: 'create-qr-invite',
      },
    ]);
  });

  it('shows clear-filters only when activeFilterCount is greater than zero', async () => {
    const provider = TestBed.inject(CommandProvider);

    const withoutFilters = await firstValueFrom(provider.search('/', { activeFilterCount: 0 }));
    expect(withoutFilters.find((item) => item.id === 'cmd-clear-filters')).toBeUndefined();

    const withFilters = await firstValueFrom(provider.search('/', { activeFilterCount: 2 }));
    expect(withFilters.find((item) => item.id === 'cmd-clear-filters')).toMatchObject({
      label: 'Clear filters',
      command: 'clear-filters',
    });
  });
});
