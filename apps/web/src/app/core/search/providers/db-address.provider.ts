import { Injectable, inject } from '@angular/core';
import { catchError, from, of, type Observable } from 'rxjs';
import { SupabaseService } from '../../supabase/supabase.service';
import { OrgSearchTuningService } from '../org-search-tuning.service';
import {
  formatLocationPickerLines,
} from '../../media-locations/media-locations.helpers';
import type { SearchAddressCandidate, SearchCandidate, SearchQueryContext } from '../search.models';
import type { SearchProvider } from '../engine/search-provider.interface';
import {
  buildCityPart,
  computeRecencyDecay,
  normalizeStreetPart,
  type AddressGroup,
} from '../search-bar-helpers';
import {
  computeTextMatchScore,
  formatDbAddressLabel,
  toNumber,
} from '../search-query';
import { logSearchEvent } from '../search-debug';

const MAX_DB_ADDRESS_ROWS = 24;

interface DbAddressRow {
  address_label: string | null;
  street: string | null;
  house_number?: string | null;
  staircase?: string | null;
  door?: string | null;
  postcode?: string | null;
  city: string | null;
  district?: string | null;
  country?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  media_item_location_links?:
    | {
        media_item_id: string;
        media_items?:
          | {
              created_at: string | null;
              organization_id?: string | null;
              media_projects?:
                | { project_id: string | null }
                | Array<{ project_id: string | null }>;
            }
          | Array<{
              created_at: string | null;
              organization_id?: string | null;
              media_projects?:
                | { project_id: string | null }
                | Array<{ project_id: string | null }>;
            }>;
      }
    | Array<{
        media_item_id: string;
        media_items?:
          | {
              created_at: string | null;
              organization_id?: string | null;
              media_projects?:
                | { project_id: string | null }
                | Array<{ project_id: string | null }>;
            }
          | Array<{
              created_at: string | null;
              organization_id?: string | null;
              media_projects?:
                | { project_id: string | null }
                | Array<{ project_id: string | null }>;
            }>;
      }>;
}

@Injectable({ providedIn: 'root' })
export class DbAddressProvider implements SearchProvider {
  private readonly supabaseService = inject(SupabaseService);
  private readonly orgSearchTuning = inject(OrgSearchTuningService);

  readonly id = 'db-address';
  readonly sectionTitle = 'Addresses';
  readonly family = 'db-address' as const;
  readonly keywords = ['address'];
  readonly priority = 10;
  readonly operatorHints = {
    '#': 'Search for a specific address',
    '+': 'Add an address filter',
    '-': 'Remove an address filter',
  };

  private termTransform: (query: string) => string = (query) => query;

  configure(options: Record<string, unknown>): void {
    if (typeof options['termTransform'] === 'function') {
      this.termTransform = options['termTransform'] as (query: string) => string;
    }
  }

  search(query: string, context: SearchQueryContext): Observable<SearchCandidate[]> {
    const effectiveQuery = this.termTransform(query);
    return from(this.fetchDbAddressCandidates(effectiveQuery, context)).pipe(catchError(() => of([])));
  }

  private async fetchDbAddressCandidates(
    query: string,
    context: SearchQueryContext,
  ): Promise<SearchAddressCandidate[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    let request = this.supabaseService.client
      .from('locations')
      .select(
        'address_label, street, house_number, city, latitude, longitude, media_item_location_links!inner(media_item_id, media_items!inner(created_at, organization_id, media_projects(project_id)))',
      )
      .ilike('address_label', `%${trimmedQuery}%`)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(MAX_DB_ADDRESS_ROWS);

    if (context.organizationId) {
      request = request.eq('organization_id', context.organizationId);
    }

    const response = await request;
    if (response.error) {
      logSearchEvent('db-address-error', {
        query: trimmedQuery,
        context: {
          organizationId: context.organizationId,
          activeProjectId: context.activeProjectId,
        },
        error: this.describeDbAddressError(response.error),
      });
      return [];
    }

    if (!Array.isArray(response.data)) {
      return [];
    }

    const grouped = this.groupAddressRows(
      response.data as unknown as DbAddressRow[],
      trimmedQuery,
      context,
    );
    return this.rankedAddressCandidates(grouped, context);
  }

  private groupAddressRows(
    rows: DbAddressRow[],
    trimmedQuery: string,
    context: SearchQueryContext,
  ): Map<string, AddressGroup> {
    const grouped = new Map<string, AddressGroup>();

    for (const row of rows) {
      const linksRaw = row.media_item_location_links;
      const links = Array.isArray(linksRaw) ? linksRaw : linksRaw ? [linksRaw] : [];
      const rawLabel = row.address_label?.trim();
      const lat = toNumber(row.latitude);
      const lng = toNumber(row.longitude);
      if (!rawLabel || lat === null || lng === null) continue;

      const street = row.street;
      const houseNumber = row.house_number;
      const streetWithNumber =
        street && houseNumber ? `${street} ${houseNumber}` : street ?? null;

      const label = formatDbAddressLabel(
        rawLabel,
        streetWithNumber,
        buildCityPart(null, row.city),
      );
      const key = label.toLowerCase();
      const textMatch = computeTextMatchScore(label, trimmedQuery);

      const pickerSnapshot = {
        street: row.street ?? null,
        house_number: row.house_number ?? null,
        staircase: row.staircase ?? null,
        door: row.door ?? null,
        postcode: row.postcode ?? null,
        city: row.city ?? null,
        district: row.district ?? null,
        country: row.country ?? null,
        address_label: rawLabel,
      };

      for (const link of links) {
        const mediaRaw = link.media_items;
        const media = Array.isArray(mediaRaw) ? mediaRaw[0] : mediaRaw;
        const mediaId = link.media_item_id;
        if (!mediaId) continue;

        const createdAtMs = media?.created_at ? Date.parse(media.created_at) : 0;
        const activeProjectHit =
          context.activeProjectId &&
          this.mediaProjectIds(media).includes(context.activeProjectId)
            ? 1
            : 0;

        const existing = grouped.get(key);
        if (existing) {
          existing.ids.push(mediaId);
          existing.latTotal += lat;
          existing.lngTotal += lng;
          existing.count += 1;
          existing.activeProjectHits += activeProjectHit;
          existing.latestCreatedAtMs = Math.max(existing.latestCreatedAtMs, createdAtMs);
          existing.score = Math.max(existing.score, textMatch);
          continue;
        }

        grouped.set(key, {
          label,
          ids: [mediaId],
          latTotal: lat,
          lngTotal: lng,
          count: 1,
          activeProjectHits: activeProjectHit,
          latestCreatedAtMs: createdAtMs,
          score: textMatch,
          pickerSnapshot,
        });
      }
    }

    return grouped;
  }

  private rankedAddressCandidates(
    grouped: Map<string, AddressGroup>,
    context: SearchQueryContext,
  ): SearchAddressCandidate[] {
    for (const entry of grouped.values()) {
      const projectBoost =
        context.activeProjectId && entry.activeProjectHits > 0
          ? 1 + entry.activeProjectHits / Math.max(1, entry.count)
          : 1;
      const dataGravity = Math.log2(entry.count + 1);
      const recencyDecay = computeRecencyDecay(entry.latestCreatedAtMs);
      entry.score = entry.score * projectBoost * dataGravity * recencyDecay;
    }

    return [...grouped.values()]
      .sort((left, right) => {
        const scoreDelta = right.score - left.score;
        if (scoreDelta !== 0) return scoreDelta;
        const countDelta = right.count - left.count;
        if (countDelta !== 0) return countDelta;
        const labelDelta = left.label.localeCompare(right.label);
        if (labelDelta !== 0) return labelDelta;
        return (left.ids[0] ?? '').localeCompare(right.ids[0] ?? '');
      })
      .slice(0, this.orgSearchTuning.orgSearchConfig().resolver.maxDbAddressResults)
      .map((entry, index) => {
        const pickerLines = formatLocationPickerLines(entry.pickerSnapshot, 'Top');
        return {
          id: entry.ids[0] ?? `db-address-${index}`,
          stableId: entry.ids[0] ?? `db-address-${index}`,
          family: 'db-address' as const,
          label: pickerLines.primary,
          secondaryLabel: pickerLines.secondary || undefined,
          lat: entry.latTotal / entry.count,
          lng: entry.lngTotal / entry.count,
          imageCount: entry.count,
          score: entry.score,
        };
      });
  }

  private mediaProjectIds(
    media:
      | {
          media_projects?:
            | { project_id: string | null }
            | Array<{ project_id: string | null }>;
        }
      | undefined,
  ): string[] {
    const links = media?.media_projects;
    if (!links) {
      return [];
    }

    return (Array.isArray(links) ? links : [links])
      .map((entry) => entry.project_id)
      .filter((projectId): projectId is string => !!projectId);
  }

  private describeDbAddressError(error: unknown): {
    code: string | null;
    message: string;
    details: string | null;
    hint: string | null;
    status: number | null;
  } {
    const candidate =
      typeof error === 'object' && error !== null
        ? (error as {
            code?: unknown;
            message?: unknown;
            details?: unknown;
            hint?: unknown;
            status?: unknown;
          })
        : null;

    return {
      code: typeof candidate?.code === 'string' ? candidate.code : null,
      message:
        typeof candidate?.message === 'string' ? candidate.message.slice(0, 300) : String(error),
      details: typeof candidate?.details === 'string' ? candidate.details.slice(0, 300) : null,
      hint: typeof candidate?.hint === 'string' ? candidate.hint.slice(0, 300) : null,
      status: typeof candidate?.status === 'number' ? candidate.status : null,
    };
  }
}
