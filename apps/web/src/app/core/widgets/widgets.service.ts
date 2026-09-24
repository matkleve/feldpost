import { Injectable, inject } from '@angular/core';
import { WidgetsCatalogAdapter } from './adapters/widgets-catalog.adapter';
import { findWidget } from './widgets.helpers';
import type { WidgetCatalogEntry } from './widgets.types';

/**
 * Catalog facade. Reading twice returns the same entries. No table.
 * @see docs/specs/service/widgets/widgets.md
 */
@Injectable({ providedIn: 'root' })
export class WidgetsService {
  private readonly catalog = inject(WidgetsCatalogAdapter);

  entries(): readonly WidgetCatalogEntry[] {
    return this.catalog.entries();
  }

  find(id: string): WidgetCatalogEntry | null {
    return findWidget(this.catalog.entries(), id);
  }
}
