/**
 * Aggregate counts for the deferred-location backlog (#232).
 *
 * The only place the backlog badge touches the database. It answers **counts**, never rows: a
 * company archive is 40 000 items and the number on a badge must not cost 40 000 rows to produce.
 * PostgREST's `count: 'exact', head: true` runs the aggregate server-side and transfers no body.
 *
 * **Scoping is RLS, not a filter here.** `media_items` is already organization-scoped by policy, and
 * the gallery read (`media-query.service.ts`) relies on the same boundary with no `organization_id`
 * predicate. Adding one only here would imply the others are unsafe.
 *
 * **Three statements, not one snapshot.** `countAll` and the two status counts are separate queries;
 * an upload landing between them can make them disagree. The service that composes them handles
 * that rather than this adapter pretending to atomicity it does not have.
 *
 * `[D]` **Never executed against a database.** This environment has no database URL, no Supabase CLI
 * and no credentials, exactly as for Phases 5.5/5.6. The query shapes follow `media-query.service.ts`
 * and use only `.in()` and an unfiltered count — deliberately avoiding `.or()` and `NOT IN`, whose
 * NULL semantics are the part that would most likely be wrong unverified. That is an argument, not
 * evidence. Tracked as an open verification.
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ providedIn: 'root' })
export class DeferredLocationCountAdapter {
  private readonly supabase = inject(SupabaseService);

  /** Every media item visible to this user. */
  async countAll(): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('media_items')
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw new Error(error.message);
    }
    return count ?? 0;
  }

  /**
   * Items whose `location_status` is one of `statuses`.
   *
   * `.in()` and nothing else. A `NOT IN` would silently drop rows with a NULL status — PostgREST
   * inherits SQL's three-valued logic, so `NULL NOT IN ('resolved')` is NULL, not true — and those
   * rows are precisely the unresolved ones this badge exists to surface. The service subtracts
   * instead, which needs no NULL reasoning at all.
   */
  async countWithStatusIn(statuses: readonly string[]): Promise<number> {
    if (statuses.length === 0) {
      return 0;
    }

    const { count, error } = await this.supabase.client
      .from('media_items')
      .select('id', { count: 'exact', head: true })
      .in('location_status', [...statuses]);

    if (error) {
      throw new Error(error.message);
    }
    return count ?? 0;
  }
}
