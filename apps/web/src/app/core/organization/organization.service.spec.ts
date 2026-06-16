import { TestBed } from '@angular/core/testing';
import { OrganizationService } from './organization.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('OrganizationService', () => {
  let service: OrganizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrganizationService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: () => ({
                select: () => ({
                  single: async () => ({ data: null, error: { message: 'not found' } }),
                  maybeSingle: async () => ({ data: null, error: null }),
                  order: () => ({ limit: async () => ({ data: [], error: null }) }),
                }),
                update: () => ({
                  select: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
                upsert: async () => ({ error: null }),
                insert: () => ({
                  select: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
              rpc: async () => ({ data: null, error: null }),
            },
          },
        },
      ],
    });

    service = TestBed.inject(OrganizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns error when profile load fails', async () => {
    const result = await service.loadProfile();
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});
