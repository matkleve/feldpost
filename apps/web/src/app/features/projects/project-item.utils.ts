import type { ProjectColorKey } from '../../core/projects/projects.types';
import { colorTokenFor } from './logic/projects-formatters.logic';

/** Resolves project accent color for item frame tinting. @see docs/specs/component/project/project-item.md */
export function projectItemColorStyle(colorKey: ProjectColorKey): string {
  return colorTokenFor(colorKey);
}
