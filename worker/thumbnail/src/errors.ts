export function logGenerationError(mediaId: string | undefined, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error('[thumbnail-worker]', { mediaId, message, stack });
}

export function registerProcessErrorHandlers(): void {
  process.on('unhandledRejection', (reason) => {
    console.error('[thumbnail-worker] unhandledRejection', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('[thumbnail-worker] uncaughtException', err);
    process.exit(1);
  });
}
