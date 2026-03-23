import type { ProjectListItem } from '../../core/projects/projects.types';

export function getProjectFieldValue(
  project: ProjectListItem,
  property: string,
): string | number | null {
  switch (property) {
    case 'name':
      return project.name;
    case 'status':
      return project.status;
    case 'district':
      return project.district;
    case 'city':
      return project.city;
    case 'color-key':
      return project.colorKey;
    case 'image-count':
      return project.totalImageCount;
    case 'updated-at':
      return project.updatedAt;
    case 'last-activity':
      return project.lastActivity;
    default:
      return null;
  }
}
