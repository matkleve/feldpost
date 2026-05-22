import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrgSearchTuningService } from './org-search-tuning.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { UserProfileService } from '../user-profile/user-profile.service';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from './search-tuning.defaults';

describe('OrgSearchTuningService', () => {
  let service: OrgSearchTuningService;
  let upsertMock: ReturnType<typeof vi.fn>;
  let deleteMock: ReturnType<typeof vi.fn>;
  let maybeSingleMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        organization_id: 'org-1',
        settings_version: 1,
        values_json: { resolver: { maxGeocoderResults: 5 } },
        updated_at: '2026-01-01T00:00:00Z',
        updated_by: 'user-1',
      },
      error: null,
    });
    upsertMock = vi.fn().mockResolvedValue({ error: null });
    deleteMock = vi.fn().mockResolvedValue({ error: null });

    const fromMock = vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock }),
      }),
      upsert: upsertMock,
      delete: vi.fn().mockReturnValue({ eq: deleteMock }),
    }));

    TestBed.configureTestingModule({
      providers: [
        OrgSearchTuningService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: fromMock,
              rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
            },
          },
        },
        {
          provide: AuthService,
          useValue: { user: signal({ id: 'user-1' }) },
        },
        {
          provide: UserProfileService,
          useValue: {
            getOwnProfile: vi.fn().mockResolvedValue({
              data: { fullName: 'Admin', organizationId: 'org-1', roles: ['admin'] },
              error: null,
            }),
          },
        },
      ],
    });

    service = TestBed.inject(OrgSearchTuningService);
  });

  it('loads and merges org profile on bootstrap', async () => {
    await service.bootstrapFromSession();
    expect(service.orgSearchConfig().resolver.maxGeocoderResults).toBe(5);
    expect(service.isOrgAdmin()).toBe(true);
  });

  it('rejects save when viewer is not admin', async () => {
    const profiles = TestBed.inject(UserProfileService);
    vi.mocked(profiles.getOwnProfile).mockResolvedValueOnce({
      data: { fullName: 'Worker', organizationId: 'org-1', roles: ['worker'] },
      error: null,
    });
    await service.bootstrapFromSession();
    await expect(service.saveOrgProfile({ resolver: { maxGeocoderResults: 4 } })).rejects.toThrow(
      /admin/i,
    );
  });

  it('resetToDefaults deletes org row and restores system defaults', async () => {
    await service.bootstrapFromSession();
    await service.resetToDefaults();
    expect(deleteMock).toHaveBeenCalled();
    expect(service.orgSearchConfig().resolver.maxGeocoderResults).toBe(
      SEARCH_TUNING_SYSTEM_DEFAULTS.resolver.maxGeocoderResults,
    );
  });
});
