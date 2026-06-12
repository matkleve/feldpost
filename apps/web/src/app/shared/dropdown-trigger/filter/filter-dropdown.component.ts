import { Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { operatorsForPropertyType, TEXT_FILTER_OPERATORS } from '../../../core/filter/filter-rule-evaluator';
import { FilterService } from '../../../core/filter/filter.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MetadataService } from '../../../core/metadata/metadata.service';
import type { FilterRule } from '../../../core/filter/filter.types';
import type { MetadataValueType } from '../../../core/metadata/metadata.types';
import { StandardDropdownComponent } from '../standard/standard-dropdown.component';
import { filterDropdownOperatorLabel } from './filter-dropdown-operator-labels';
import { computeFilterPickerFlyoutGeom } from './filter-dropdown-picker-geometry';
import type { FilterRulePickerField, OpenFilterRulePicker, PickerFlyoutGeom } from './filter-dropdown.types';
import { HlmMenuItemDirective } from '../../ui/menu';
import { HLM_INPUT_IMPORTS } from '../../ui/input';
import { HLM_BUTTON_IMPORTS } from '../../ui/button';

export interface FilterDropdownPropertyOption {
  id: string;
  label: string;
  type: MetadataValueType;
}

@Component({
  selector: 'app-filter-dropdown',
  templateUrl: './filter-dropdown.component.html',
  styleUrl: './filter-dropdown.component.scss',
  imports: [
    StandardDropdownComponent,
    HlmMenuItemDirective,
    ...HLM_INPUT_IMPORTS,
    ...HLM_BUTTON_IMPORTS,
  ],
})
export class FilterDropdownComponent {
  protected readonly filterService = inject(FilterService);
  private readonly i18nService = inject(I18nService);
  private readonly metadata = inject(MetadataService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  constructor() {
    effect(() => {
      const open = this.openRulePicker();
      if (!open) {
        return;
      }
      const exists = this.filterService.rules().some((r) => r.id === open.ruleId);
      if (!exists) {
        this.closePickerFlyout();
      }
    });
  }

  /** Stable state: open inline picker; closed when null. */
  // @see docs/specs/component/filters/filter-dropdown.md
  protected readonly openRulePicker = signal<OpenFilterRulePicker | null>(null);

  /** Stable state: viewport-anchored flyout box for the open picker (fixed positioning). */
  // @see docs/specs/component/filters/filter-dropdown.md
  protected readonly pickerFlyoutGeom = signal<PickerFlyoutGeom | null>(null);

  readonly propertyOptionsInput = input<FilterDropdownPropertyOption[] | null>(null);

  readonly propertyOptions = computed(() => {
    const provided = this.propertyOptionsInput();
    if (provided) return provided;

    return this.metadata.filterableMetadataFields().map((field) => ({
      id: field.id,
      label: field.label,
      type: field.valueType,
    }));
  });

  removeRule(id: string): void {
    if (this.openRulePicker()?.ruleId === id) {
      this.closePickerFlyout();
    }
    this.filterService.removeRule(id);
  }

  private closePickerFlyout(): void {
    this.openRulePicker.set(null);
    this.pickerFlyoutGeom.set(null);
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    if (this.openRulePicker()) {
      this.closePickerFlyout();
    }
  }

  protected onRulesScroll(): void {
    if (this.openRulePicker()) {
      this.closePickerFlyout();
    }
  }

  protected ruleById(id: string): FilterRule | undefined {
    return this.filterService.rules().find((r) => r.id === id);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const open = this.openRulePicker();
    if (!open) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.closest('[data-filter-picker-flyout]')) {
      return;
    }
    const marker = `[data-filter-picker="${open.ruleId}-${open.field}"]`;
    if (target.closest(marker)) {
      return;
    }
    this.closePickerFlyout();
  }

  protected isPickerOpen(ruleId: string, field: FilterRulePickerField): boolean {
    const o = this.openRulePicker();
    return o !== null && o.ruleId === ruleId && o.field === field;
  }

  protected togglePicker(event: MouseEvent, ruleId: string, field: FilterRulePickerField): void {
    event.stopPropagation();
    const cur = this.openRulePicker();
    const trigger = event.currentTarget as HTMLElement | null;
    if (cur?.ruleId === ruleId && cur.field === field) {
      this.closePickerFlyout();
      return;
    }
    this.openRulePicker.set({ ruleId, field });
    if (trigger) {
      this.pickerFlyoutGeom.set(computeFilterPickerFlyoutGeom(trigger));
    } else {
      this.pickerFlyoutGeom.set(null);
    }
  }

  protected pickProperty(event: MouseEvent, ruleId: string, propertyId: string): void {
    event.stopPropagation();
    this.updateProperty(ruleId, propertyId);
    this.closePickerFlyout();
  }

  protected pickOperator(event: MouseEvent, ruleId: string, operator: string): void {
    event.stopPropagation();
    this.updateOperator(ruleId, operator);
    this.closePickerFlyout();
  }

  protected propertyTriggerLabel(propertyId: string): string {
    if (!propertyId) {
      return this.t('workspace.filter.property', 'Property');
    }
    const opt = this.propertyOptions().find((p) => p.id === propertyId);
    return opt?.label ?? propertyId;
  }

  protected operatorTriggerLabel(operator: string): string {
    if (!operator) {
      return this.t('workspace.filter.operator', 'Operator');
    }
    return this.operatorLabel(operator);
  }

  conjunctionLabel(index: number, conjunction: string): string {
    if (index === 0) {
      return this.t('workspace.filter.conjunction.where', 'Where');
    }

    return conjunction === 'and'
      ? this.t('workspace.filter.conjunction.and', 'And')
      : this.t('workspace.filter.conjunction.or', 'Or');
  }

  operatorLabel(operator: string): string {
    return filterDropdownOperatorLabel(this.t, operator);
  }

  /** Longest property label for picker ghost sizing (locale-aware via `propertyOptions`). */
  protected longestPropertySizingLabel(): string {
    const placeholder = this.t('workspace.filter.property', 'Property');
    let longest = placeholder;
    for (const option of this.propertyOptions()) {
      if (option.label.length > longest.length) {
        longest = option.label;
      }
    }
    return longest;
  }

  /** Longest operator label for the active property type (picker ghost sizing). */
  protected longestOperatorSizingLabel(propertyId: string): string {
    const placeholder = this.t('workspace.filter.operator', 'Operator');
    let longest = placeholder;
    for (const operator of this.getOperatorsForRule(propertyId)) {
      const label = this.operatorLabel(operator);
      if (label.length > longest.length) {
        longest = label;
      }
    }
    return longest;
  }

  /** Longest operator label across all property types (empty-state shell ghost sizing). */
  protected longestOperatorSizingLabelAll(): string {
    const placeholder = this.t('workspace.filter.operator', 'Operator');
    let longest = placeholder;
    const seen = new Set<string>();
    for (const option of this.propertyOptions()) {
      for (const operator of operatorsForPropertyType(option.type)) {
        if (seen.has(operator)) {
          continue;
        }
        seen.add(operator);
        const label = this.operatorLabel(operator);
        if (label.length > longest.length) {
          longest = label;
        }
      }
    }
    return longest;
  }

  toggleConjunction(id: string): void {
    const rules = this.filterService.rules();
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      this.filterService.updateRule(id, {
        conjunction: rule.conjunction === 'and' ? 'or' : 'and',
      });
    }
  }

  updateProperty(id: string, value: string): void {
    // When property changes, reset operator if it's not valid for the new type
    const propType = this.getPropertyType(value);
    const validOps = operatorsForPropertyType(propType);
    const rules = this.filterService.rules();
    const rule = rules.find((r) => r.id === id);
    const patch: Record<string, string> = { property: value };
    if (rule && !validOps.includes(rule.operator)) {
      patch['operator'] = '';
    }
    this.filterService.updateRule(id, patch);
  }

  updateOperator(id: string, value: string): void {
    this.filterService.updateRule(id, { operator: value });
  }

  updateValue(id: string, value: string): void {
    this.filterService.updateRule(id, { value });
  }

  getOperatorsForRule(propertyId: string): string[] {
    if (!propertyId) return TEXT_FILTER_OPERATORS;
    return operatorsForPropertyType(this.getPropertyType(propertyId));
  }

  getInputType(propertyId: string): string {
    if (!propertyId) return 'text';
    return this.getPropertyType(propertyId) === 'number' ? 'number' : 'text';
  }

  private getPropertyType(propertyId: string): MetadataValueType | undefined {
    const provided = this.propertyOptionsInput();
    if (provided) {
      return provided.find((option) => option.id === propertyId)?.type;
    }

    return this.metadata.getMetadataField(propertyId)?.valueType;
  }
}
