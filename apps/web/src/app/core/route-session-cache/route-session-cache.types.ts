import type { ImageUploadedEvent } from '../upload/upload-manager.types';
import type { RouteSessionShellKey } from './route-session-cache.keys';

export interface RouteCacheEntry<T> {
  readonly data: T;
  readonly querySignature: string;
  readonly cachedAt: number;
}

export type RevalidateHandler = (signature: string) => Promise<void>;

export type DeletePatchHandler<T = unknown> = (
  mediaItemIds: string[],
  entry: RouteCacheEntry<T>,
) => void;

export type ShellUploadPolicy = 'revalidate-active' | 'invalidate';

export type ShellDeletePolicy = 'invalidate' | 'patch';

export type ShellRestorePolicy = 'invalidate';

export interface ShellRouteCachePolicy {
  readonly shellKey: RouteSessionShellKey;
  readonly onUpload: ShellUploadPolicy;
  readonly onDelete: ShellDeletePolicy;
  readonly onRestore: ShellRestorePolicy;
}

export interface ShellRevalidateState {
  timer: ReturnType<typeof setTimeout> | null;
  inFlightSignature: string | null;
}

export type RouteUploadDispatchEvent =
  | { readonly kind: 'batchComplete' }
  | { readonly kind: 'imageUploaded'; readonly event: ImageUploadedEvent }
  | { readonly kind: 'imageReplaced' }
  | { readonly kind: 'imageAttached' };

export type UploadActivityHandler = (event: RouteUploadDispatchEvent) => boolean;
