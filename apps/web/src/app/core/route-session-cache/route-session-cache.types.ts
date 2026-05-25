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
