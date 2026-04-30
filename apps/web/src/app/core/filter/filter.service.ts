import { Injectable, computed, inject, signal } from '@angular/core';
import type { WorkspaceImage } from '../workspace-view/workspace-view.types';
import type { FilterRule } from './filter.types';
import { evaluateRulesForItem } from './filter-rule-evaluator';
import { MetadataService } from '../metadata/metadata.service';

let nextRuleId = 0;

@Injectable({ providedIn: 'root' })
export class FilterService {
  private readonly metadata = inject(MetadataService);
  private readonly _rules = signal<FilterRule[]>([]);
  readonly rules = this._rules.asReadonly();

  readonly activeCount = computed(() => this._rules().length);

  addRule(): void {
    this._rules.update((list) => [
      ...list,
      {
        id: `rule-${++nextRuleId}`,
        conjunction: list.length === 0 ? 'where' : 'and',
        property: '',
        operator: '',
        value: '',
      },
    ]);
  }

  updateRule(id: string, patch: Partial<FilterRule>): void {
    this._rules.update((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  removeRule(id: string): void {
    this._rules.update((list) => list.filter((r) => r.id !== id));
  }

  clearAll(): void {
    this._rules.set([]);
  }

  /**
   * Tests whether a single image passes all filter rules.
   * Uses AND/OR conjunction logic across the rule list.
   */
  matchesClientSide(image: WorkspaceImage, rules: FilterRule[]): boolean {
    return evaluateRulesForItem(image, rules, this.getFieldValue.bind(this));
  }

  private getFieldValue(image: WorkspaceImage, property: string): string | null {
    const val = this.metadata.getFilterValue(image, property);
    return val != null ? String(val) : null;
  }
}
