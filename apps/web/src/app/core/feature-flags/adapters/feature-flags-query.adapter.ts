import { Injectable } from '@angular/core';

/** Reads the `ff` search parameter. Does not write storage. */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsQueryAdapter {
  read(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('ff');
  }
}
