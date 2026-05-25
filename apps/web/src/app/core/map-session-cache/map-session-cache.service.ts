import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime, merge } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MediaDeleteUndoService } from '../media-delete/media-delete-undo.service';
import { UploadManagerService } from '../upload/upload-manager.service';
import type { MapSessionSnapshot } from './map-session-cache.types';

@Injectable({ providedIn: 'root' })
export class MapSessionCacheService {
  private readonly authService = inject(AuthService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);

  private snapshot: MapSessionSnapshot | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    merge(
      this.uploadManager.batchComplete$,
      this.uploadManager.imageUploaded$,
      this.uploadManager.imageReplaced$,
      this.uploadManager.imageAttached$,
    )
      .pipe(auditTime(300), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.invalidate();
      });

    this.mediaDeleteUndo.mediaDeleted$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.invalidate();
      });

    this.mediaDeleteUndo.mediaRestored$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.invalidate();
      });

    effect(() => {
      if (!this.authService.session()) {
        this.invalidate();
      }
    });
  }

  read(): MapSessionSnapshot | null {
    return this.snapshot;
  }

  write(snapshot: MapSessionSnapshot): void {
    this.snapshot = snapshot;
  }

  invalidate(): void {
    this.snapshot = null;
  }
}
