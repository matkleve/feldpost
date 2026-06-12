import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ProjectsProvider } from './projects.provider';
import { SupabaseService } from '../../supabase/supabase.service';
import { provideOrgSearchTuningTestDouble } from '../search-test.providers';

describe('ProjectsProvider', () => {
  it('returns empty list for empty query', async () => {
    TestBed.configureTestingModule({
      providers: [
        ProjectsProvider,
        provideOrgSearchTuningTestDouble(),
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: () => ({
                select: () => ({
                  ilike: () => ({
                    limit: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            },
          },
        },
      ],
    });

    const provider = TestBed.inject(ProjectsProvider);
    const results = await firstValueFrom(provider.search('', {}));
    expect(results).toEqual([]);
  });
});
