import type { MetadataValueType } from './metadata/metadata.types';

export type FilterRuleLike = {
  conjunction: string;
  property: string;
  operator: string;
  value: string;
};

export const TEXT_FILTER_OPERATORS = ['contains', 'equals', 'is', 'is not', 'before', 'after'];
export const NUMBER_FILTER_OPERATORS = ['=', '≠', '>', '<', '≥', '≤'];
export const DATE_FILTER_OPERATORS = ['is', 'is not', 'before', 'after'];

export function operatorsForPropertyType(type: MetadataValueType | undefined): string[] {
  switch (type) {
    case 'number':
      return NUMBER_FILTER_OPERATORS;
    case 'date':
      return DATE_FILTER_OPERATORS;
    default:
      return TEXT_FILTER_OPERATORS;
  }
}

export function evaluateRulesForItem<T>(
  item: T,
  rules: ReadonlyArray<FilterRuleLike>,
  getFieldValue: (item: T, property: string) => string | number | null,
): boolean {
  if (rules.length === 0) return true;

  let result = evaluateRuleForItem(item, rules[0]!, getFieldValue);

  for (let i = 1; i < rules.length; i += 1) {
    const rule = rules[i]!;
    const ruleResult = evaluateRuleForItem(item, rule, getFieldValue);
    if (rule.conjunction === 'or') {
      result = result || ruleResult;
    } else {
      result = result && ruleResult;
    }
  }

  return result;
}

export function evaluateRuleForItem<T>(
  item: T,
  rule: FilterRuleLike,
  getFieldValue: (item: T, property: string) => string | number | null,
): boolean {
  const fieldValue = getFieldValue(item, rule.property);
  const ruleValue = rule.value.toLowerCase();

  if (fieldValue == null) {
    return rule.operator === 'is not' || rule.operator === '≠' ? ruleValue !== '' : false;
  }

  const fieldStr = String(fieldValue).toLowerCase();
  if (NUMBER_FILTER_OPERATORS.includes(rule.operator)) {
    const numField = parseFloat(fieldStr);
    const numRule = parseFloat(ruleValue);
    if (Number.isNaN(numField) || Number.isNaN(numRule)) return false;

    switch (rule.operator) {
      case '=':
        return numField === numRule;
      case '≠':
        return numField !== numRule;
      case '>':
        return numField > numRule;
      case '<':
        return numField < numRule;
      case '≥':
        return numField >= numRule;
      case '≤':
        return numField <= numRule;
      default:
        return true;
    }
  }

  switch (rule.operator) {
    case 'contains':
      return fieldStr.includes(ruleValue);
    case 'equals':
    case 'is':
      return fieldStr === ruleValue;
    case 'is not':
      return fieldStr !== ruleValue;
    case 'before':
      return fieldStr < ruleValue;
    case 'after':
      return fieldStr > ruleValue;
    default:
      return true;
  }
}
