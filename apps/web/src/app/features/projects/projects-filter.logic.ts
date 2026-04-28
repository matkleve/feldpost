import { evaluateRulesForItem } from '../../core/filter/filter-rule-evaluator';
import type { ProjectListItem } from '../../core/projects/projects.types';
import { getProjectFieldValue } from './projects-fields.logic';

export type ProjectFilterRule = {
  conjunction: string;
  property: string;
  operator: string;
  value: string;
};

export function applyProjectFilters(
  projects: ProjectListItem[],
  rules: ProjectFilterRule[],
): ProjectListItem[] {
  if (rules.length === 0) {
    return projects;
  }

  return projects.filter((project) => evaluateRulesForItem(project, rules, getProjectFieldValue));
}
