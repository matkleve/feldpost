import type { FilterService } from '../filter/filter.service';
import type { FilterRule } from '../filter/filter.types';
import type { MetadataService } from '../metadata/metadata.service';
import type { ImageRecord } from './media-query.types';
import type {
  GroupedSection,
  MetadataFieldRef,
  SortConfig,
  WorkspaceMedia,
} from '../workspace-view/workspace-view.types';

/** Drops incomplete draft rules so filter evaluation stays stable. */
/** @see docs/specs/service/workspace-view/workspace-view-system.md */
export function filterActivatableRules(rules: readonly FilterRule[]): FilterRule[] {
  return rules.filter((r) => r.property.length > 0 && r.operator.length > 0);
}

/** Applies the same project membership filter contract as WorkspaceViewService. */
/** @see docs/specs/service/workspace-view/workspace-view-system.md */
export function applyProjectFilterForMediaGallery(
  images: readonly WorkspaceMedia[],
  projectIds: ReadonlySet<string>,
): WorkspaceMedia[] {
  if (projectIds.size === 0) {
    return [...images];
  }

  return images.filter((img) => {
    const ids = img.projectIds?.length ? img.projectIds : img.projectId ? [img.projectId] : [];
    return ids.some((id) => projectIds.has(id));
  });
}

/** Applies FilterService rules client-side against WorkspaceMedia rows. */
/** @see docs/specs/service/workspace-view/workspace-view-system.md */
export function applyRuleFilterForMediaGallery(
  images: readonly WorkspaceMedia[],
  rules: readonly FilterRule[],
  filterService: FilterService,
): WorkspaceMedia[] {
  const active = filterActivatableRules(rules);
  if (active.length === 0) {
    return [...images];
  }

  return images.filter((img) => filterService.matchesClientSide(img, active));
}

/** Multi-key sort using MetadataService sortable values (mirrors WorkspaceViewService). */
/** @see docs/specs/service/workspace-view/workspace-view-system.md */
export function sortWorkspaceMediaForGallery(
  images: readonly WorkspaceMedia[],
  sorts: readonly SortConfig[],
  metadata: MetadataService,
): WorkspaceMedia[] {
  const copy = [...images];
  if (sorts.length === 0) {
    return copy;
  }

  return copy.sort((a, b) => {
    for (const sort of sorts) {
      const valA = metadata.getSortableValue(a, sort.key);
      const valB = metadata.getSortableValue(b, sort.key);
      if (valA == null && valB == null) {
        continue;
      }
      if (valA == null) {
        return 1;
      }
      if (valB == null) {
        return -1;
      }

      let cmp: number;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        cmp = strA < strB ? -1 : strA > strB ? 1 : 0;
      }
      if (cmp !== 0) {
        return sort.direction === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });
}

function buildGroupsRecursive(
  images: WorkspaceMedia[],
  groupings: MetadataFieldRef[],
  level: number,
  metadata: MetadataService,
): GroupedSection[] {
  if (groupings.length === 0) {
    return [{ heading: '', headingLevel: level, imageCount: images.length, images }];
  }

  const [current, ...rest] = groupings;
  const buckets = new Map<string, WorkspaceMedia[]>();

  for (const img of images) {
    const key = metadata.getGroupingLabel(img, current.id);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(img);
    } else {
      buckets.set(key, [img]);
    }
  }

  const sections: GroupedSection[] = [];
  for (const [heading, groupImages] of buckets) {
    const section: GroupedSection = {
      heading,
      headingLevel: level,
      imageCount: groupImages.length,
      images: rest.length === 0 ? groupImages : [],
    };
    if (rest.length > 0) {
      section.subGroups = buildGroupsRecursive(groupImages, rest, level + 1, metadata);
      section.imageCount = groupImages.length;
    }
    sections.push(section);
  }

  return sections;
}

/** Builds grouped sections for the media gallery using MetadataService grouping labels. */
/** @see docs/specs/service/workspace-view/workspace-view-system.md */
export function buildGroupedSectionsForMediaGallery(
  images: readonly WorkspaceMedia[],
  groupings: readonly MetadataFieldRef[],
  metadata: MetadataService,
): GroupedSection[] {
  if (groupings.length === 0) {
    return [{ heading: '', headingLevel: 0, imageCount: images.length, images: [...images] }];
  }

  return buildGroupsRecursive([...images], [...groupings], 0, metadata);
}

export type MediaGalleryRenderRow =
  | { type: 'header'; heading: string; imageCount: number; level: number }
  | { type: 'grid'; items: ImageRecord[] };

/** Flattens grouped sections into header + grid rows for the media content template. */
/** @see docs/specs/component/item-grid/item-grid.md#wiring */
export function flattenGroupedSectionsToMediaRenderRows(
  sections: readonly GroupedSection[],
  mapToImageRecord: (w: WorkspaceMedia) => ImageRecord,
): MediaGalleryRenderRow[] {
  const out: MediaGalleryRenderRow[] = [];

  const walk = (secs: readonly GroupedSection[]) => {
    for (const s of secs) {
      if (s.heading) {
        out.push({
          type: 'header',
          heading: s.heading,
          imageCount: s.imageCount,
          level: s.headingLevel,
        });
      }
      if (s.subGroups && s.subGroups.length > 0) {
        walk(s.subGroups);
      } else if (s.images.length > 0) {
        out.push({ type: 'grid', items: s.images.map(mapToImageRecord) });
      }
    }
  };

  walk(sections);
  return out;
}

/** Hides rows under collapsed group headers (same contract as workspace thumbnail grid). */
/** @see docs/specs/service/workspace-view/workspace-view-system.md */
export function isMediaGalleryRenderRowHidden(
  rows: readonly MediaGalleryRenderRow[],
  index: number,
  collapsed: ReadonlySet<string>,
): boolean {
  const item = rows[index];
  if (!item) {
    return false;
  }

  if (item.type === 'header' && item.level === 0) {
    return false;
  }

  let contextLevel = item.type === 'header' ? item.level : Infinity;

  for (let i = index - 1; i >= 0; i--) {
    const prev = rows[i];
    if (!prev) {
      break;
    }
    if (prev.type === 'header' && prev.level < contextLevel) {
      if (collapsed.has(prev.heading)) {
        return true;
      }
      contextLevel = prev.level;
      if (contextLevel === 0) {
        break;
      }
    }
  }

  return false;
}

/** Runs project filter, rule filter, sort, then grouping for the /media gallery surface. */
/** @see docs/specs/service/workspace-view/workspace-view-system.md */
export function runMediaGalleryViewPipeline(options: {
  images: readonly WorkspaceMedia[];
  projectIds: ReadonlySet<string>;
  rules: readonly FilterRule[];
  sorts: readonly SortConfig[];
  groupings: readonly MetadataFieldRef[];
  filterService: FilterService;
  metadata: MetadataService;
}): GroupedSection[] {
  const projectFiltered = applyProjectFilterForMediaGallery(options.images, options.projectIds);
  const ruleFiltered = applyRuleFilterForMediaGallery(
    projectFiltered,
    options.rules,
    options.filterService,
  );
  const sorted = sortWorkspaceMediaForGallery(ruleFiltered, options.sorts, options.metadata);
  return buildGroupedSectionsForMediaGallery(sorted, options.groupings, options.metadata);
}
