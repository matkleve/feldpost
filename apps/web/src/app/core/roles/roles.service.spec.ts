import { TestBed } from '@angular/core/testing';
import { RoleService } from './roles.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProfileService } from '../user-profile/user-profile.service';

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RoleService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: () => ({
                select: () => ({ order: async () => ({ data: [], error: null }) }),
              }),
              rpc: async () => ({ data: 0, error: null }),
            },
          },
        },
        {
          provide: UserProfileService,
          useValue: {
            getOwnProfile: async () => ({ data: { organizationId: 'org-1', fullName: '', roles: [] }, error: null }),
          },
        },
      ],
    });

    service = TestBed.inject(RoleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
