type TranslateFn = (key: string, fallback?: string) => string;

/**
 * Maps filter operator tokens to translator keys (English fallbacks per i18n contract).
 * @see docs/specs/component/filters/filter-dropdown.md
 */
export function filterDropdownOperatorLabel(t: TranslateFn, operator: string): string {
  switch (operator) {
    case 'contains':
      return t('workspace.filter.operator.contains', 'contains');
    case 'equals':
      return t('workspace.filter.operator.equals', 'equals');
    case 'is':
      return t('workspace.filter.operator.is', 'is');
    case 'is not':
      return t('workspace.filter.operator.isNot', 'is not');
    case 'before':
      return t('workspace.filter.operator.before', 'before');
    case 'after':
      return t('workspace.filter.operator.after', 'after');
    default:
      return operator;
  }
}
