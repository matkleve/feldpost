/**
 * Declarative row-action registry for upload panel item menus.
 * @see docs/specs/component/upload/upload-panel.lane-and-row-actions.md § Row Action Registry Shape
 */

import type { UploadJob } from '../../../core/upload/upload-manager.service';
import type { UploadItemMenuAction } from './upload-panel-item.component';
import { getBoundProjectIds } from './upload-panel-project-bindings.util';
import { getIssueKind, getLaneForJob, type UploadIssueKind, type UploadLane } from '../upload-phase.helpers';

export interface RowActionRegistryContext {
  job: UploadJob;
  lane: UploadLane;
  issueKind: UploadIssueKind;
  showOpenProject: boolean;
  priorityEnabled: boolean;
}

interface RowActionRegistryEntry {
  id: UploadItemMenuAction;
  /** Canonical menu order index (lower = earlier). */
  order: number;
  isAvailable: (ctx: RowActionRegistryContext) => boolean;
}

const PLACEMENT_ISSUE_KINDS: readonly UploadIssueKind[] = [
  'missing_gps',
  'address_deferred',
  'document_unresolved',
];

/** Canonical menu order — one entry per action id. */
const ROW_ACTION_REGISTRY: readonly RowActionRegistryEntry[] = [
  {
    id: 'view_file_details',
    order: 10,
    isAvailable: (ctx) => ctx.lane === 'uploading',
  },
  {
    id: 'cancel_upload',
    order: 20,
    isAvailable: (ctx) => ctx.lane === 'uploading',
  },
  {
    id: 'change_location_map',
    order: 30,
    isAvailable: (ctx) => {
      if (ctx.lane === 'uploaded') {
        return !!ctx.job.mediaId;
      }
      if (ctx.lane === 'issues' && ctx.issueKind !== null) {
        return PLACEMENT_ISSUE_KINDS.includes(ctx.issueKind);
      }
      return false;
    },
  },
  {
    id: 'change_location_address',
    order: 40,
    isAvailable: (ctx) => {
      if (ctx.lane === 'uploaded') {
        return !!ctx.job.mediaId;
      }
      if (ctx.lane === 'issues' && ctx.issueKind !== null) {
        return PLACEMENT_ISSUE_KINDS.includes(ctx.issueKind);
      }
      return false;
    },
  },
  {
    id: 'open_in_media',
    order: 50,
    isAvailable: (ctx) => ctx.lane === 'uploaded' && !!ctx.job.mediaId,
  },
  {
    id: 'assign_to_project',
    order: 60,
    isAvailable: (ctx) => {
      if (ctx.lane === 'uploaded') {
        return !!ctx.job.mediaId;
      }
      return ctx.lane === 'issues' && ctx.issueKind === 'document_unresolved';
    },
  },
  {
    id: 'open_project',
    order: 70,
    isAvailable: (ctx) =>
      ctx.lane === 'uploaded' &&
      !!ctx.job.mediaId &&
      getBoundProjectIds(ctx.job).length > 0 &&
      ctx.showOpenProject,
  },
  {
    id: 'toggle_priority',
    order: 80,
    isAvailable: (ctx) => ctx.lane === 'uploaded' && !!ctx.job.mediaId && ctx.priorityEnabled,
  },
  {
    id: 'download',
    order: 90,
    isAvailable: (ctx) => ctx.lane === 'uploaded' && !!ctx.job.mediaId && !!ctx.job.storagePath,
  },
  {
    id: 'open_existing_media',
    order: 100,
    isAvailable: (ctx) =>
      ctx.lane === 'issues' &&
      ctx.issueKind === 'duplicate_file' &&
      !!ctx.job.existingMediaId,
  },
  {
    id: 'upload_anyway',
    order: 110,
    isAvailable: (ctx) => ctx.lane === 'issues' && ctx.issueKind === 'duplicate_file',
  },
  {
    id: 'retry',
    order: 120,
    isAvailable: (ctx) => {
      if (ctx.lane !== 'issues' || ctx.issueKind === null) {
        return false;
      }
      if (ctx.issueKind === 'upload_error') {
        return !ctx.job.wasCancelled;
      }
      return (
        PLACEMENT_ISSUE_KINDS.includes(ctx.issueKind) || ctx.issueKind === 'conflict_review'
      );
    },
  },
  {
    id: 'candidate_select',
    order: 130,
    isAvailable: (ctx) =>
      ctx.lane === 'issues' &&
      ctx.issueKind === 'address_ambiguous' &&
      (ctx.job.addressCandidates?.length ?? 0) > 0,
  },
  {
    id: 'manual_location_entry',
    order: 140,
    isAvailable: (ctx) => ctx.lane === 'issues' && ctx.issueKind === 'address_ambiguous',
  },
  {
    id: 'cancel_location_prompt',
    order: 150,
    isAvailable: (ctx) => ctx.lane === 'issues' && ctx.issueKind === 'address_ambiguous',
  },
  {
    id: 'remove_from_project',
    order: 160,
    isAvailable: (ctx) =>
      ctx.lane === 'uploaded' && !!ctx.job.mediaId && getBoundProjectIds(ctx.job).length > 0,
  },
  {
    id: 'delete_media',
    order: 170,
    isAvailable: (ctx) => ctx.lane === 'uploaded' && !!ctx.job.mediaId,
  },
  {
    id: 'dismiss',
    order: 180,
    isAvailable: (ctx) => ctx.lane === 'issues' && ctx.issueKind !== null,
  },
];

/** Registry-filtered row menu actions in canonical order. */
export function resolveUploadRowMenuActions(ctx: RowActionRegistryContext): UploadItemMenuAction[] {
  const actions = ROW_ACTION_REGISTRY.filter((entry) => entry.isAvailable(ctx))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.id);

  if (ctx.lane === 'uploaded' && !ctx.job.mediaId) {
    return ['dismiss'];
  }

  return actions;
}

/** Build registry context from a job row. */
export function rowActionContextForJob(
  job: UploadJob,
  options: Pick<RowActionRegistryContext, 'showOpenProject' | 'priorityEnabled'>,
): RowActionRegistryContext {
  return {
    job,
    lane: getLaneForJob(job),
    issueKind: getIssueKind(job),
    showOpenProject: options.showOpenProject,
    priorityEnabled: options.priorityEnabled,
  };
}
