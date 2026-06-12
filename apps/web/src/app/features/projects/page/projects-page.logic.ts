export { applyProjectFilters } from '../logic/projects-filter.logic';
export type { ProjectFilterRule } from '../logic/projects-filter.logic';

export { tableAriaSort, tableSortDirection, sortProjects } from '../logic/projects-sort.logic';

export { buildGroupedSections } from '../logic/projects-grouping.logic';

export {
  pendingActionTitle,
  pendingActionMessage,
  pendingActionConfirmLabel,
  colorTokenFor,
  formatRelativeDate,
  projectStatusLabel,
  projectLabel,
  toProjectSummary,
} from '../logic/projects-formatters.logic';
