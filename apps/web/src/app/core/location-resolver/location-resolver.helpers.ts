/**
 * Location-status predicates — the one place a `media_items.location_status` value is turned into
 * an answer about whether an item still needs a location.
 *
 * ## Why this module exists (#222)
 *
 * `MediaRecord.location_unresolved` used to be derived in four places that did not agree:
 *
 * ```
 * media_items row for Archiv/Wien/1010/IMG_0090.jpg   location_status = 'partial'
 *
 *   media-query.service.ts        → location_unresolved: true    (gallery badge: needs a location)
 *   media-detail-data.facade.ts   → location_unresolved: false   (detail pane: located)
 *   media-locations.helpers.ts    → location_unresolved: true    (no coordinates on the link)
 *   media-detail-view.utils.ts    → location_unresolved: false   (…once a patch carried coords)
 * ```
 *
 * The same photo answered "is this unresolved?" differently depending on which mapper loaded it,
 * and which of those mappers wrote last. `isBulkEligibleStatus` read the column directly to avoid
 * inheriting the disagreement, and said so in its doc comment; that sidestepped it for one consumer
 * without fixing it.
 *
 * The decision, its reasoning and the `partial` case are recorded in
 * `docs/specs/service/location-resolver/README.md` § Location Status Contract. The short form: a
 * status is either "an established location" or "work still to do", and `location_unresolved` is
 * exactly the second — the same fact bulk eligibility and the deferred-location backlog already
 * read off the column.
 *
 * @see docs/specs/service/location-resolver/README.md
 * @see docs/specs/service/media-query/media-query-service.md
 */

/**
 * Statuses that mean the item **has** an established location: a place on the map a user can point
 * at. Everything else — including the legacy spellings and anything unknown — is outstanding work.
 *
 * Exported because the deferred-location count queries filter on exactly this set; a second literal
 * list would let the query and the predicate drift.
 */
export const LOCATED_LOCATION_STATUSES: readonly string[] = ['resolved', 'gps'];

const LOCATED_LOCATION_STATUS_SET: ReadonlySet<string> = new Set(LOCATED_LOCATION_STATUSES);

/**
 * Does this `location_status` mean the item's location is still unresolved?
 *
 * Fails toward `true`: an unknown or absent status is outstanding work, because an item wrongly
 * shown as needing attention is visible and correctable, while one wrongly hidden is neither.
 */
export function isLocationUnresolvedStatus(status: string | null | undefined): boolean {
  return !status || !LOCATED_LOCATION_STATUS_SET.has(status);
}
