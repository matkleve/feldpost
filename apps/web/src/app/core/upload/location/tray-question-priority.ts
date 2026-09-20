/**
 * STUDY-009 idea A (#231) — what a tray question is worth, from its **kind**.
 *
 * The owner's proposal reached for distance: *"questions about being 20 metres off are low
 * priority"*. Distance is a proxy for how wrong an answer can be in metres, and it is a leaky one,
 * because two questions at the same 20 m can have opposite stakes:
 *
 * ```
 * Thalistraße 4 vs Thalistraße 6   adjacent buildings, one owner, one job
 *                                  wrong → the photo sits 20 m off on a map, nobody is harmed
 *
 * Thalistraße 4 vs Thalistraße 4a  two properties, two clients, a damage claim on one of them
 *                                  wrong → evidence is filed against the wrong party
 * ```
 *
 * Same metres, opposite consequences. What differs is not the magnitude of the error but **what
 * depends on the field downstream** — and that is a property of the question's kind, which the
 * pipeline already carries on every group as `disambiguationKind`.
 *
 * The line falls at **"is the item findable and in the right place?"** Every `critical`/`high` kind
 * answers that question. Every `low` kind refines an answer that is already correct.
 *
 * This module is classification only. It asks nothing, suppresses nothing, and renders nothing: it
 * makes priority a property the budget (#233) and the deferred-improvement surface (#232) can read.
 * It has no runtime caller until #233 lands — deliberately, because encoding the *"a budget may
 * only ever suppress `low`"* invariant **before** any budget exists is what stops the budget being
 * built wrong.
 *
 * @see docs/specs/service/media-upload-service/upload-tray-question-priority.supplement.md
 * @see docs/study/009-tray-question-budget-and-priority.md
 */

import type { UploadDisambiguationKind } from '../upload-manager.types';

export type UploadTrayQuestionPriority = 'critical' | 'high' | 'low';

/**
 * Kind → priority. Complete and closed: `UploadDisambiguationKind` has exactly seven values.
 *
 * The `Record<UploadDisambiguationKind, …>` annotation is load-bearing. A kind added to the union
 * later — `exif_house_number` when #221 chooses D-09's radius and builds its tray — fails the
 * typecheck here rather than defaulting to something silently. STUDY-009 already argues that one is
 * `low`: the address is correct without it, so the question is enrichment.
 */
export const TRAY_QUESTION_PRIORITY: Readonly<
  Record<UploadDisambiguationKind, UploadTrayQuestionPriority>
> = {
  /** Which city/state/country the item belongs to. Wrong → search will never find it. */
  admin_level_conflict: 'critical',
  /** The city, when the path gave only a street. A street with no city is not an address. */
  city_step: 'critical',
  /** Text vs EXIF disagree. Wrong → the item lands somewhere it never was. */
  source: 'critical',

  /** Whether a point is inside a claimed area. Wrong area: misleading, but recoverable. */
  containment_check: 'high',
  /** Which package of address fields wins. Wrong → mixed evidence from two places. */
  layer_package: 'high',
  /** Which of several geocode hits. Wrong → could be a different town, same street name. */
  geocode: 'high',

  /** Which house number on an already-correct street. Wrong → imprecise by one building. */
  house_step: 'low',
};

/**
 * The only priority a budget may ever suppress (STUDY-009 § Correction 4).
 *
 * Named rather than inlined so the invariant has one address. A budget that can silence an
 * `admin_level_conflict` is a bug, not a policy.
 */
export const BUDGET_SUPPRESSIBLE_PRIORITY: UploadTrayQuestionPriority = 'low';

/**
 * A group's priority, from its kind.
 *
 * `disambiguationKind` is optional on `UploadDisambiguationGroup`, so absent is a real case. An
 * unclassified question is rated `critical` — the same fail-safe direction `isBulkEligibleStatus`
 * takes, and for the same reason: a question wrongly *asked* is visible and cheap, a question
 * wrongly *suppressed* is invisible and is the silent data loss #232 exists to prevent.
 */
export function trayQuestionPriority(
  kind: UploadDisambiguationKind | null | undefined,
): UploadTrayQuestionPriority {
  if (!kind) {
    return 'critical';
  }
  return TRAY_QUESTION_PRIORITY[kind];
}

/** May a budget drop this question? The single gate — callers must not compare priorities. */
export function isBudgetSuppressible(kind: UploadDisambiguationKind | null | undefined): boolean {
  return trayQuestionPriority(kind) === BUDGET_SUPPRESSIBLE_PRIORITY;
}

/**
 * The subset of `items` a budget is allowed to consider dropping.
 *
 * `kindOf` is explicit and has **no default**: a helper parameter typed from its own default
 * argument is [TRAP-023]'s second shape. Callers pass their own accessor, which is also what keeps
 * this usable over `UploadDisambiguationGroup[]` without this module importing the group type.
 *
 * The budget applies to what this returns and to nothing else. When it returns fewer items than the
 * budget wanted to drop, the budget's answer is "fewer than you asked for", never "make up the
 * difference from the `high` pile".
 */
export function selectBudgetSuppressible<T>(
  items: readonly T[],
  kindOf: (item: T) => UploadDisambiguationKind | null | undefined,
): T[] {
  return items.filter((item) => isBudgetSuppressible(kindOf(item)));
}
