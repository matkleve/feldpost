import { Injectable, inject } from '@angular/core';
import { catchError, from, of, type Observable } from 'rxjs';
import { SupabaseService } from '../../supabase/supabase.service';
import { OrgSearchTuningService } from '../org-search-tuning.service';
import { fetchDbContentCandidates } from '../search-bar-resolvers';
import type { SearchCandidate, SearchQueryContext } from '../search.models';
import type { SearchProvider } from '../engine/search-provider.interface';

@Injectable({ providedIn: 'root' })
export class ProjectsProvider implements SearchProvider {
  private readonly supabaseService = inject(SupabaseService);
  private readonly orgSearchTuning = inject(OrgSearchTuningService);

  readonly id = 'projects';
  readonly sectionTitle = 'Projects';
  readonly family = 'db-content' as const;
  readonly keywords = ['project'];
  readonly priority = 30;
  readonly chipCapable = true;
  readonly operatorHints = {
    '#': 'Search for a specific project',
    '+': 'Add a project to the search',
    '-': 'Remove a project from the search',
  };

  search(query: string, context: SearchQueryContext): Observable<SearchCandidate[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return of([]);
    }

    return from(
      fetchDbContentCandidates(
        this.supabaseService,
        trimmedQuery,
        context,
        this.orgSearchTuning.orgSearchConfig().resolver.maxDbContentResults,
      ),
    ).pipe(catchError(() => of([])));
  }
}
