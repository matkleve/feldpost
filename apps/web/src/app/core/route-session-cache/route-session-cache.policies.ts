import { ROUTE_SESSION_SHELL_KEYS } from './route-session-cache.keys';
import type { ShellRouteCachePolicy } from './route-session-cache.types';

export const ROUTE_SESSION_SHELL_POLICIES: readonly ShellRouteCachePolicy[] = [
  {
    shellKey: ROUTE_SESSION_SHELL_KEYS.MEDIA,
    onUpload: 'revalidate-active',
    onDelete: 'patch',
    onRestore: 'invalidate',
  },
  {
    shellKey: ROUTE_SESSION_SHELL_KEYS.MAP,
    onUpload: 'invalidate',
    onDelete: 'invalidate',
    onRestore: 'invalidate',
  },
];
