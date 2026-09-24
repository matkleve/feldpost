import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileService } from '../user-profile/user-profile.service';
import { WidgetsCatalogAdapter } from '../widgets/adapters/widgets-catalog.adapter';
import { WidgetsService } from '../widgets/widgets.service';
import { OrganizationWidgetsAdapter } from './adapters/organization-widgets.adapter';
import { OrganizationWidgetsService } from './organization-widgets.service';

describe('OrganizationWidgetsService', () => {
  const upsert = vi.fn(async () => undefined);
  const getOwnProfile = vi.fn(async () => ({
    data: { fullName: 'Ada', organizationId: 'org-1', roles: ['admin'] },
    error: null,
  }));

  beforeEach(() => {
    upsert.mockClear();
    getOwnProfile.mockClear();
    TestBed.configureTestingModule({
      providers: [
        OrganizationWidgetsService,
        WidgetsService,
        WidgetsCatalogAdapter,
        { provide: UserProfileService, useValue: { getOwnProfile } },
        { provide: OrganizationWidgetsAdapter, useValue: { upsert } },
      ],
    });
  });

  it('writes one install row for an installable widget', async () => {
    const service = TestBed.inject(OrganizationWidgetsService);
    await service.install('vehicles');
    await service.install('vehicles');
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith({ organization_id: 'org-1', widget_id: 'vehicles' });
  });

  it('does not write a fixed rail widget or an unknown id', async () => {
    const service = TestBed.inject(OrganizationWidgetsService);
    await expect(service.install('map')).rejects.toThrow('Widget is not installable');
    await expect(service.install('nope')).rejects.toThrow('Widget is not installable');
    expect(upsert).not.toHaveBeenCalled();
  });
});
