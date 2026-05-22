import { Injectable } from '@angular/core';
import type { Router } from '@angular/router';
import type { UploadLocationMapPickRequest } from './workspace-pane-shell-events.types';

export interface LocationMapPickNavigationPayload {
  request: UploadLocationMapPickRequest;
  returnUrl: string;
}

@Injectable({ providedIn: 'root' })
export class LocationMapPickNavigationService {
  readPayload(router: Router): LocationMapPickNavigationPayload | null {
    const candidate = this.readCandidate(router);
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const payload = candidate as Partial<LocationMapPickNavigationPayload>;
    const request = payload.request;
    if (
      typeof payload.returnUrl !== 'string' ||
      !payload.returnUrl.startsWith('/') ||
      !request ||
      typeof request !== 'object' ||
      typeof request.mediaId !== 'string' ||
      typeof request.fileName !== 'string'
    ) {
      return null;
    }

    return {
      request: {
        mediaId: request.mediaId,
        fileName: request.fileName,
        locationRowId:
          typeof request.locationRowId === 'string' ? request.locationRowId : undefined,
      },
      returnUrl: payload.returnUrl,
    };
  }

  private readCandidate(router: Router): unknown {
    const fromNavigation = router.getCurrentNavigation()?.extras?.state?.['locationMapPickNav'];
    const fromHistory =
      typeof window !== 'undefined'
        ? (window.history.state?.['locationMapPickNav'] as unknown)
        : null;
    return fromNavigation ?? fromHistory;
  }
}
