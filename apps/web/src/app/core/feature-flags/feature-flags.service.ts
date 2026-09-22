import { Injectable, inject, signal } from '@angular/core';
import { FeatureFlagsQueryAdapter } from './adapters/feature-flags-query.adapter';
import { FeatureFlagsStorageAdapter } from './adapters/feature-flags-storage.adapter';
import { resolveFlag } from './feature-flags.helpers';

/**
 * Migration flag facade. One signal, resolved once.
 * @see docs/specs/service/feature-flags/feature-flags.md
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly query = inject(FeatureFlagsQueryAdapter);
  private readonly storage = inject(FeatureFlagsStorageAdapter);

  readonly shellGridLayout = signal(this.readShellGridLayout());

  private readShellGridLayout(): boolean {
    const resolved = resolveFlag('shellGridLayout', {
      query: this.query.read(),
      stored: this.storage.read('shellGridLayout'),
    });
    if (resolved.persist !== null) {
      this.storage.write('shellGridLayout', resolved.persist);
    }
    return resolved.value;
  }
}
