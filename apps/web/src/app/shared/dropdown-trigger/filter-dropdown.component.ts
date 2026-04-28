import { Component, computed, inject, input } from '@angular/core';
import { operatorsForPropertyType, TEXT_FILTER_OPERATORS } from '../../core/filter/filter-rule-evaluator';
import { FilterService } from '../../core/filter/filter.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MetadataService } from '../../core/metadata/metadata.service';
import type { MetadataValueType } from '../../core/metadata/metadata.types';
import { StandardDropdownComponent } from './standard-dropdown.component';
import { UI_PRIMITIVE_DIRECTIVES } from '../ui-primitives/ui-primitives.directive';

export interface FilterDropdownPropertyOption {
  id: string;
  label: string;
  type: MetadataValueType;
}

@Component({
  selector: 'app-filter-dropdown',
  templateUrl: './filter-dropdown.component.html',
  styleUrl: './filter-dropdown.component.scss',
  imports: [StandardDropdownComponent, ...UI_PRIMITIVE_DIRECTIVES],
})
export class FilterDropdownComponent {
  protected readonly filterService = inject(FilterService);
  private readonly i18nService = inject(I18nService);
  private readonly metadata = inject(MetadataService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

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
    this.filterService.removeRule(id);
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
    switch (operator) {
      case 'contains':
        return this.t('workspace.filter.operator.contains', 'contains');
      case 'equals':
        return this.t('workspace.filter.operator.equals', 'equals');
      case 'is':
        return this.t('workspace.filter.operator.is', 'is');
      case 'is not':
        return this.t('workspace.filter.operator.isNot', 'is not');
      case 'before':
        return this.t('workspace.filter.operator.before', 'before');
      case 'after':
        return this.t('workspace.filter.operator.after', 'after');
      default:
        return operator;
    }
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
