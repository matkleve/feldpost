import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseService } from '../supabase/supabase.service';
import { WidgetInstallService } from './widget-install.service';

describe('WidgetInstallService.load', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('keeps the five current apps when the read fails', async () => {
    const from = vi.fn().mockReturnValue({
      select: () => Promise.resolve({ data: null, error: { message: 'missing' } }),
    });
    TestBed.configureTestingModule({
      providers: [
        WidgetInstallService,
        { provide: SupabaseService, useValue: { client: { from } } },
      ],
    });

    const service = TestBed.inject(WidgetInstallService);
    await service.load();

    expect(service.installedIds()).toEqual([
      'map',
      'media',
      'projects',
      'colleagues',
      'organization',
    ]);
  });

  it('uses Map and Media when the read succeeds with no user rows', async () => {
    const from = vi.fn((table: string) => ({
      select: () =>
        Promise.resolve({
          data:
            table === 'organization_widget_policies'
              ? [
                  { widget_id: 'map', allowed: true, preinstalled: true, locked: false },
                  { widget_id: 'media', allowed: true, preinstalled: true, locked: false },
                ]
              : [],
          error: null,
        }),
    }));
    TestBed.configureTestingModule({
      providers: [
        WidgetInstallService,
        { provide: SupabaseService, useValue: { client: { from } } },
      ],
    });

    const service = TestBed.inject(WidgetInstallService);
    await service.load();

    expect(service.installedIds()).toEqual(['map', 'media']);
  });
});
