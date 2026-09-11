/**
 * Warns the user before they close/reload the tab while an upload is in
 * flight. `event.returnValue` is legacy — modern browsers ignore custom
 * text and show their own generic prompt, but some engines still gate the
 * dialog on it being set to a truthy value, so both are set.
 * @see https://github.com/matkleve/feldpost/issues/141 (UP-05)
 */
export function warnBeforeUnload(event: BeforeUnloadEvent): void {
  event.preventDefault();
  event.returnValue = '';
}

export interface UploadManagerEffectsDeps<UserLike> {
  createEffect: (runner: () => void) => void;
  getUser: () => UserLike | null | undefined;
  hasRunning: () => boolean;
  cancelAllActive: () => Promise<void>;
  isBusy: () => boolean;
  addBeforeUnloadListener: (handler: (event: BeforeUnloadEvent) => void) => void;
  removeBeforeUnloadListener: (handler: (event: BeforeUnloadEvent) => void) => void;
  beforeUnloadHandler: (event: BeforeUnloadEvent) => void;
}

export function registerUploadManagerEffects<UserLike>(
  deps: UploadManagerEffectsDeps<UserLike>,
): void {
  deps.createEffect(() => {
    const user = deps.getUser();
    if (!user && deps.hasRunning()) {
      void deps.cancelAllActive().catch((err) => {
        console.error('[upload-manager] sign-out residue cleanup failed after session cleared:', err);
      });
    }
  });

  deps.createEffect(() => {
    if (deps.isBusy()) {
      deps.addBeforeUnloadListener(deps.beforeUnloadHandler);
    } else {
      deps.removeBeforeUnloadListener(deps.beforeUnloadHandler);
    }
  });
}
