import type { GroupingProperty } from '../../shared/dropdown-trigger/grouping-dropdown.component';
import type { FilterDropdownPropertyOption } from '../../shared/dropdown-trigger/filter-dropdown.component';
import type { SortDropdownOption } from '../../shared/dropdown-trigger/sort-dropdown.component';
import type { ProjectListItem } from '../../core/projects/projects.types';

export interface ProjectGroupedSection {
  id: string;
  heading: string;
  level: number;
  projectCount: number;
  projects: ProjectListItem[];
}

export type PendingProjectAction = 'archive' | 'restore' | 'delete' | null;

export const GROUPING_OPTIONS: GroupingProperty[] = [
  { id: 'status', icon: 'inventory_2', label: 'Status' },
  { id: 'district', icon: 'map', label: 'Primary district' },
  { id: 'city', icon: 'location_city', label: 'Primary city' },
  { id: 'color-key', icon: 'palette', label: 'Color' },
];

export const FILTER_OPTIONS: FilterDropdownPropertyOption[] = [
  { id: 'name', type: 'text', label: 'Name' },
  { id: 'status', type: 'text', label: 'Status' },
  { id: 'district', type: 'text', label: 'Primary district' },
  { id: 'city', type: 'text', label: 'Primary city' },
  { id: 'color-key', type: 'text', label: 'Color' },
  { id: 'image-count', type: 'number', label: 'Image count' },
  { id: 'updated-at', type: 'date', label: 'Updated' },
  { id: 'last-activity', type: 'date', label: 'Last activity' },
];

export const SORT_OPTIONS: SortDropdownOption[] = [
  { id: 'name', icon: 'sort_by_alpha', defaultDirection: 'asc', label: 'Name' },
  { id: 'updated-at', icon: 'update', defaultDirection: 'desc', label: 'Updated' },
  { id: 'last-activity', icon: 'history', defaultDirection: 'desc', label: 'Last activity' },
  { id: 'image-count', icon: 'photo_library', defaultDirection: 'desc', label: 'Image count' },
  { id: 'status', icon: 'inventory_2', defaultDirection: 'asc', label: 'Status' },
  { id: 'district', icon: 'map', defaultDirection: 'asc', label: 'Primary district' },
  { id: 'city', icon: 'location_city', defaultDirection: 'asc', label: 'Primary city' },
  { id: 'color-key', icon: 'palette', defaultDirection: 'asc', label: 'Color' },
];


