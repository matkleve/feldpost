export interface UploadManagerEffectsDeps<UserLike> {
  createEffect: (runner: () => void) => void;
  getUser: () => UserLike | null | undefined;
  hasRunning: () => boolean;
  cancelAllActive: () => void;
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
      deps.cancelAllActive();
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
