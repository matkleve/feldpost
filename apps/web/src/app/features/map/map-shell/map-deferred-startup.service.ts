import { Injectable } from '@angular/core';

export interface DeferredStartupHandles {
  rafId: number | null;
  startupTimer: ReturnType<typeof setTimeout> | null;
  markerBootstrapTimer: ReturnType<typeof setTimeout> | null;
}

@Injectable({ providedIn: 'root' })
export class MapDeferredStartupService {
  scheduleDeferredStartup(params: {
    handles: DeferredStartupHandles;
    runStartup: () => void;
  }): void {
    const run = () => {
      params.runStartup();
    };

    if (typeof window === 'undefined') {
      run();
      return;
    }

    params.handles.rafId = window.requestAnimationFrame(() => {
      params.handles.rafId = null;
      params.handles.startupTimer = setTimeout(() => {
        params.handles.startupTimer = null;
        run();
      }, 0);
    });
  }

  cancelDeferredStartup(handles: DeferredStartupHandles): void {
    if (handles.rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(handles.rafId);
      handles.rafId = null;
    }

    if (handles.startupTimer) {
      clearTimeout(handles.startupTimer);
      handles.startupTimer = null;
    }

    if (handles.markerBootstrapTimer) {
      clearTimeout(handles.markerBootstrapTimer);
      handles.markerBootstrapTimer = null;
    }
  }
}
