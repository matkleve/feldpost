import type { FilterRuleLike } from './filter-rule-evaluator';

/** Operators that apply without a user-entered value. */
const VALUE_OPTIONAL_OPERATORS = new Set(['is empty']);

/** True when a rule has enough fields to participate in filtering and toolbar counts. */
export function isFilterRuleComplete(rule: FilterRuleLike): boolean {
  if (!rule.property?.trim() || !rule.operator?.trim()) {
    return false;
  }
  if (VALUE_OPTIONAL_OPERATORS.has(rule.operator)) {
    return true;
  }
  return rule.value.trim().length > 0;
}
