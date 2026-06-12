import type { Observable } from 'rxjs';
import type {
  SearchCandidate,
  SearchOperatorPrefix,
  SearchQueryContext,
  SearchResultFamily,
} from '../search.models';

export interface SearchProviderOperatorHints {
  '#': string;
  '+': string;
  '-': string;
}

export interface SearchProvider {
  readonly id: string;
  readonly sectionTitle: string;
  readonly family: SearchResultFamily;
  /** Keyword without operator prefix, e.g. `project` for `#project`. */
  readonly keywords?: string[];
  readonly priority?: number;
  readonly chipCapable?: boolean;
  readonly operatorHints?: SearchProviderOperatorHints;

  search(query: string, context: SearchQueryContext): Observable<SearchCandidate[]>;
  configure?(options: Record<string, unknown>): void;
  destroy?(): void;
}

export interface SearchProviderKeywordMeta {
  provider: SearchProvider;
  operator: SearchOperatorPrefix;
  label: string;
  descriptionKey: string;
  descriptionFallback: string;
}
