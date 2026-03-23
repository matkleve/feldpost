import type { SortConfig } from '../../core/workspace-view.types';
import type { ProjectListItem } from '../../core/projects/projects.types';
import { getProjectFieldValue } from './projects-fields.logic';

export function tableSortDirection(
  activeSorts: SortConfig[],
  columnKey: string,
): 'asc' | 'desc' | null {
  const primarySort = activeSorts[0];
  if (!primarySort || primarySort.key !== columnKey) {
    return null;
  }

  return primarySort.direction;
}

export function tableAriaSort(
  activeSorts: SortConfig[],
  columnKey: string,
): 'ascending' | 'descending' | 'none' {
  const direction = tableSortDirection(activeSorts, columnKey);
  if (direction === 'asc') {
    return 'ascending';
  }
  if (direction === 'desc') {
    return 'descending';
  }
  return 'none';
}

export function sortProjects(
  projects: ProjectListItem[],
  activeSorts: SortConfig[],
): ProjectListItem[] {
  const sorted = [...projects];
  if (activeSorts.length === 0) {
    sorted.sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
    return sorted;
  }

  sorted.sort((left, right) => {
    for (const sort of activeSorts) {
      const leftValue = getProjectFieldValue(left, sort.key);
      const rightValue = getProjectFieldValue(right, sort.key);
      const order = compareValues(leftValue, rightValue);
      if (order !== 0) {
        return sort.direction === 'asc' ? order : -order;
      }
    }
    return left.name.localeCompare(right.name);
  });

  return sorted;
}

function compareValues(left: string | number | null, right: string | number | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;

  const leftAsDate = Date.parse(String(left));
  const rightAsDate = Date.parse(String(right));
  if (Number.isFinite(leftAsDate) && Number.isFinite(rightAsDate)) {
    return leftAsDate - rightAsDate;
  }

  return String(left).localeCompare(String(right));
}
