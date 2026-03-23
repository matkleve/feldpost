import type { ProjectListItem } from '../../core/projects/projects.types';
import type { GroupingProperty } from '../map/workspace-pane/workspace-toolbar/grouping-dropdown.component';
import type { ProjectGroupedSection } from './projects-page.config';

export function buildGroupedSections(
  projects: ProjectListItem[],
  groupings: GroupingProperty[],
  pathKeys: string[],
  t: (key: string, fallback?: string) => string,
): ProjectGroupedSection[] {
  if (groupings.length === 0) {
    return [
      {
        id: pathKeys.join('||') || 'all-projects',
        heading: '',
        level: Math.max(pathKeys.length - 1, 0),
        projectCount: projects.length,
        projects,
      },
    ];
  }

  const [current, ...rest] = groupings;
  const buckets = new Map<string, ProjectListItem[]>();
  for (const project of projects) {
    const value = getGroupingValue(project, current.id, t);
    const bucket = buckets.get(value);
    if (bucket) bucket.push(project);
    else buckets.set(value, [project]);
  }

  const sections: ProjectGroupedSection[] = [];
  for (const [groupValue, bucket] of buckets) {
    const nextPathKeys = [...pathKeys, `${current.id}:${groupValue}`];
    sections.push({
      id: `${nextPathKeys.join('||')}::header`,
      heading: `${current.label}: ${groupValue}`,
      level: pathKeys.length,
      projectCount: bucket.length,
      projects: [],
    });

    if (rest.length === 0) {
      sections.push({
        id: `${nextPathKeys.join('||')}::leaf`,
        heading: '',
        level: pathKeys.length,
        projectCount: bucket.length,
        projects: bucket,
      });
    } else {
      sections.push(...buildGroupedSections(bucket, rest, nextPathKeys, t));
    }
  }

  return sections;
}

function getGroupingValue(
  project: ProjectListItem,
  groupingId: string,
  t: (key: string, fallback?: string) => string,
): string {
  switch (groupingId) {
    case 'status':
      return project.status === 'archived'
        ? t('projects.page.status.archived', 'Archived')
        : t('projects.page.status.active', 'Active');
    case 'district':
      return project.district ?? t('projects.page.value.unknownDistrict', 'Unknown district');
    case 'city':
      return project.city ?? t('projects.page.value.unknownCity', 'Unknown city');
    case 'color-key':
      return project.colorKey;
    default:
      return t('projects.page.value.other', 'Other');
  }
}
