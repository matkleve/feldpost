/** A Notion-style filter rule owned by FilterService. */
export interface FilterRule {
  id: string;
  conjunction: 'where' | 'and' | 'or';
  property: string;
  operator: string;
  value: string;
}



