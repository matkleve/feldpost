import type { SearchOperatorPrefix } from '../search.models';

export interface ParsedSearchQuery {
  raw: string;
  operator?: SearchOperatorPrefix;
  keyword?: string;
  searchTerm: string;
  isBareOperator: boolean;
  isOperatorSuggestionMode: boolean;
}

const OPERATOR_PATTERN = /^([#+\-])(\w*)(?:\s+(.*))?$/s;

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      raw,
      searchTerm: '',
      isBareOperator: false,
      isOperatorSuggestionMode: false,
    };
  }

  const bareMatch = trimmed.match(/^([#+\-])\s*$/);
  if (bareMatch) {
    return {
      raw,
      operator: bareMatch[1] as SearchOperatorPrefix,
      searchTerm: '',
      isBareOperator: true,
      isOperatorSuggestionMode: true,
    };
  }

  const match = trimmed.match(OPERATOR_PATTERN);
  if (!match) {
    return {
      raw,
      searchTerm: trimmed,
      isBareOperator: false,
      isOperatorSuggestionMode: false,
    };
  }

  const operator = match[1] as SearchOperatorPrefix;
  const keyword = match[2]?.toLowerCase() || undefined;
  const searchTerm = (match[3] ?? '').trim();

  if (!keyword) {
    return {
      raw,
      operator,
      searchTerm: '',
      isBareOperator: true,
      isOperatorSuggestionMode: true,
    };
  }

  return {
    raw,
    operator,
    keyword,
    searchTerm,
    isBareOperator: false,
    isOperatorSuggestionMode: false,
  };
}

export function providerMatchesKeyword(providerKeywords: string[] | undefined, keyword: string): boolean {
  if (!providerKeywords?.length) return false;
  const normalized = keyword.toLowerCase();
  return providerKeywords.some((entry) => entry.toLowerCase() === normalized);
}
