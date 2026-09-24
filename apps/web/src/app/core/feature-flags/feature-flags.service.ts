import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FeatureFlagsQueryAdapter } from './adapters/feature-flags-query.adapter';
import { FeatureFlagsStorageAdapter } from './adapters/feature-flags-storage.adapter';
import { resolveFlag } from './feature-flags.helpers';

/**
 * Migration flag facade. Resolves once at inject, then re-syncs on navigation.
 * @see docs/specs/service/feature-flags/feature-flags.md
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly query = inject(FeatureFlagsQueryAdapter);
  private readonly storage = inject(FeatureFlagsStorageAdapter);
  private readonly router = inject(Router);

  readonly shellGridLayout = signal(this.readShellGridLayout());

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.shellGridLayout.set(this.readShellGridLayout());
      });
  }

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
