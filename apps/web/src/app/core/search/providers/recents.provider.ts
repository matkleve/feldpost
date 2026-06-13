import { Injectable } from '@angular/core';
import { of, type Observable } from 'rxjs';
import type { SearchCandidate, SearchQueryContext } from '../search.models';
import type { SearchProvider } from '../engine/search-provider.interface';
import {
  compareRecents,
  sanitizeRecentLabel,
  type StoredRecentSearch,
} from '../search-bar-helpers';
import type { SearchRecentCandidate } from '../search.models';

const RECENT_SEARCHES_STORAGE_KEY = 'feldpost-recent-searches';
const MAX_RECENT_SEARCHES = 20;

@Injectable({ providedIn: 'root' })
export class RecentsProvider implements SearchProvider {
  readonly id = 'recents';
  readonly sectionTitle = 'Recent searches';
  readonly family = 'recent' as const;
  readonly priority = 0;

  private recentLimit = 8;

  configure(options: Record<string, unknown>): void {
    if (typeof options['recentMaxItems'] === 'number') {
      this.recentLimit = options['recentMaxItems'];
    }
  }

  search(_query: string, context: SearchQueryContext): Observable<SearchCandidate[]> {
    const recents = this.getRecentSearches(this.recentLimit, context.activeProjectId);
    return of(recents);
  }

  loadRecentSearches(): SearchRecentCandidate[] {
    const storage = this.getStorage();
    if (!storage) return [];

    try {
      const raw = storage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (item): item is StoredRecentSearch =>
            typeof item === 'object' &&
            item !== null &&
            'label' in item &&
            typeof item.label === 'string',
        )
        .map((item) => ({
          id: `recent-${item.label.trim().toLowerCase()}`,
          family: 'recent' as const,
          label: sanitizeRecentLabel(item.label),
          secondaryLabel:
            typeof item.secondaryLabel === 'string' && item.secondaryLabel.trim().length > 0
              ? item.secondaryLabel.trim()
              : undefined,
          lat: typeof item.lat === 'number' && Number.isFinite(item.lat) ? item.lat : undefined,
          lng: typeof item.lng === 'number' && Number.isFinite(item.lng) ? item.lng : undefined,
          lastUsedAt:
            typeof item.lastUsedAt === 'string' ? item.lastUsedAt : new Date(0).toISOString(),
          projectId: typeof item.projectId === 'string' ? item.projectId : undefined,
          usageCount: Math.max(1, Number(item.usageCount) || 1),
        }))
        .filter((item) => item.label.length > 0)
        .slice(0, MAX_RECENT_SEARCHES);
    } catch {
      return [];
    }
  }

  addRecentSearch(
    label: string,
    projectId?: string,
    existingRecents?: SearchRecentCandidate[],
    secondaryLabel?: string,
    coords?: { lat: number; lng: number },
  ): SearchRecentCandidate[] {
    const normalizedLabel = label.trim();
    if (!normalizedLabel) return existingRecents ?? [];

    const normalizedSecondary = secondaryLabel?.trim() || undefined;
    const now = new Date().toISOString();
    const recents = existingRecents ?? this.loadRecentSearches();
    const existing = recents.find(
      (entry) => entry.label.toLowerCase() === normalizedLabel.toLowerCase(),
    );

    const item: SearchRecentCandidate = {
      id: `recent-${normalizedLabel.toLowerCase()}`,
      family: 'recent',
      label: normalizedLabel,
      secondaryLabel: normalizedSecondary ?? existing?.secondaryLabel,
      lat: coords?.lat ?? existing?.lat,
      lng: coords?.lng ?? existing?.lng,
      lastUsedAt: now,
      projectId,
      usageCount: Math.max(1, existing?.usageCount ?? 0) + (existing ? 1 : 0),
    };

    const next = [
      item,
      ...recents.filter((entry) => entry.label.toLowerCase() !== normalizedLabel.toLowerCase()),
    ]
      .sort((left, right) => compareRecents(left, right, projectId))
      .slice(0, MAX_RECENT_SEARCHES);

    this.persistRecentSearches(next);
    return next;
  }

  getRecentSearches(limit: number, activeProjectId?: string): SearchRecentCandidate[] {
    return [...this.loadRecentSearches()]
      .sort((left, right) => compareRecents(left, right, activeProjectId))
      .slice(0, limit);
  }

  private persistRecentSearches(recents: SearchRecentCandidate[]): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      const serializable: StoredRecentSearch[] = recents.map((entry) => ({
        label: entry.label,
        secondaryLabel: entry.secondaryLabel,
        lat: entry.lat,
        lng: entry.lng,
        lastUsedAt: entry.lastUsedAt,
        projectId: entry.projectId,
        usageCount: Math.max(1, entry.usageCount ?? 1),
      }));
      storage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore storage failures.
    }
  }

  private getStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }
}
