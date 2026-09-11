/**
 * Upload resolver tray step/answer visual state FSM.
 * @see docs/specs/component/upload/upload-resolver-tray.stepper-fsm.supplement.md
 * @see .cursor/rules/ui-state-machine.mdc
 */

import type { TrayResolveItem } from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';
import type { TrayItemStatus } from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';

/** Single typed visual API for tray answer surfaces. */
export type UploadResolverTrayVisualState =
  | 'idle'
  | 'blocked'
  | 'text_answer'
  | 'choice_list'
  | 'house_step';

export const UPLOAD_RESOLVER_TRAY_TRANSITIONS: Record<
  UploadResolverTrayVisualState,
  UploadResolverTrayVisualState[]
> = {
  idle: ['blocked', 'text_answer', 'choice_list', 'house_step'],
  blocked: ['text_answer', 'choice_list', 'house_step', 'idle'],
  text_answer: ['blocked', 'choice_list', 'house_step', 'idle'],
  choice_list: ['blocked', 'text_answer', 'house_step', 'idle'],
  house_step: ['blocked', 'text_answer', 'choice_list', 'idle'],
};

export function canTransitionUploadResolverTrayState(
  current: UploadResolverTrayVisualState,
  next: UploadResolverTrayVisualState,
): boolean {
  if (current === next) {
    return true;
  }
  return UPLOAD_RESOLVER_TRAY_TRANSITIONS[current].includes(next);
}

export function deriveUploadResolverTrayVisualState(
  item: TrayResolveItem | null,
  itemStatus: TrayItemStatus,
): UploadResolverTrayVisualState {
  if (!item) {
    return 'idle';
  }
  if (itemStatus === 'blocked') {
    return 'blocked';
  }
  if (item.answerKind === 'text') {
    return 'text_answer';
  }
  if (item.trayStepLabel === '1b') {
    return 'house_step';
  }
  return 'choice_list';
}

export function goToUploadResolverTrayVisualState(
  current: UploadResolverTrayVisualState,
  next: UploadResolverTrayVisualState,
): UploadResolverTrayVisualState {
  return canTransitionUploadResolverTrayState(current, next) ? next : current;
}

/** Live job ids on the active tray item (excludes vanished jobs). */
export function liveTrayJobIds(
  jobIds: readonly string[],
  findJob: (id: string) => { id: string } | undefined,
): string[] {
  return jobIds.filter((id) => findJob(id) != null);
}

export function disambiguationGroupIdFromTrayItem(item: TrayResolveItem | null): string | undefined {
  return (item?.payloadRef as { disambiguationGroupId?: string } | undefined)
    ?.disambiguationGroupId;
}
