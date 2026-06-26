/**
 * Tray orchestrator types — presentation bundles and dialogue items.
 * @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md
 */

export const PRESENTATION_BUNDLE_WINDOW_MS = 5000;
export const PRESENTATION_BUNDLE_MAX_DIALOGUE_UNITS = 5;

export type TrayAnswerKind = 'single_choice' | 'text';

export type TrayItemStatus = 'blocked' | 'ready' | 'resolved' | 'skipped';

export type PresentationBundleStatus = 'collecting' | 'presenting' | 'flushed';

export interface TrayResolveOption {
  id: string;
  label: string;
  lat?: number;
  lng?: number;
  score?: number;
  city?: string | null;
}

export interface TrayResolveItem {
  id: string;
  /** One user-facing question in the bundle (1A+1B share one id). */
  dialogueUnitId: string;
  producerId: string;
  batchId: string;
  questionKey: string;
  questionParams: Record<string, string>;
  answerKind: TrayAnswerKind;
  options: TrayResolveOption[];
  jobIds: string[];
  folderDisplayPath?: string;
  dependsOnItemId?: string;
  /** Carousel sub-label when part of a dependent chain (1a / 1b). */
  trayStepLabel?: '1a' | '1b';
  payloadRef?: unknown;
}

export interface PresentationBundle {
  id: string;
  batchId: string;
  items: TrayResolveItem[];
  status: PresentationBundleStatus;
  openedAt: number;
}

export interface TrayItemAnswer {
  optionId?: string;
  text?: string;
}

export interface TrayItemResolvedEvent {
  batchId: string;
  bundleId: string;
  itemId: string;
  producerId: string;
  answer: TrayItemAnswer | null;
  skipped: boolean;
  item: TrayResolveItem;
}

export interface TrayBundleCompletedEvent {
  batchId: string;
  bundleId: string;
  results: TrayItemResolvedEvent[];
}

export interface EnqueueTrayItemInput {
  dialogueUnitId: string;
  producerId: string;
  batchId: string;
  questionKey: string;
  questionParams?: Record<string, string>;
  answerKind?: TrayAnswerKind;
  options: TrayResolveOption[];
  jobIds: string[];
  folderDisplayPath?: string;
  dependsOnItemId?: string;
  trayStepLabel?: '1a' | '1b';
  payloadRef?: unknown;
}
