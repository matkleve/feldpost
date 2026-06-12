import { describe, expect, it } from 'vitest';
import { parseSearchQuery, providerMatchesKeyword } from './search-operator';

describe('search-operator', () => {
  it('parses bare # as operator suggestion mode', () => {
    const parsed = parseSearchQuery('#');
    expect(parsed.isOperatorSuggestionMode).toBe(true);
    expect(parsed.operator).toBe('#');
    expect(parsed.keyword).toBeUndefined();
  });

  it('parses exclusive #project query', () => {
    const parsed = parseSearchQuery('#project Haderstraße');
    expect(parsed.operator).toBe('#');
    expect(parsed.keyword).toBe('project');
    expect(parsed.searchTerm).toBe('Haderstraße');
    expect(parsed.isOperatorSuggestionMode).toBe(false);
  });

  it('parses additive +project query', () => {
    const parsed = parseSearchQuery('+project Alpha');
    expect(parsed.operator).toBe('+');
    expect(parsed.keyword).toBe('project');
    expect(parsed.searchTerm).toBe('Alpha');
  });

  it('matches provider keywords case-insensitively', () => {
    expect(providerMatchesKeyword(['project'], 'Project')).toBe(true);
    expect(providerMatchesKeyword(['address'], 'project')).toBe(false);
  });
});
