import { Component, computed, inject, input } from '@angular/core';
import { operatorsForPropertyType, TEXT_FILTER_OPERATORS } from '../../core/filter-rule-evaluator';
import { FilterService } from '../../core/filter.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PropertyRegistryService } from '../../core/property-registry.service';
import type { PropertyType } from '../../core/property-registry.types';
import { StandardDropdownComponent } from './standard-dropdown.component';
import { UI_PRIMITIVE_DIRECTIVES } from '../ui-primitives/ui-primitives.directive';

export interface FilterDropdownPropertyOption {
  id: string;
  label: string;
  type: PropertyType;
}

@Component({
  selector: 'app-filter-dropdown',
  template: `
    <app-standard-dropdown
      class="filter-dropdown"
      [showSearch]="false"
      [actionLabel]="t('workspace.filter.action.add', 'Add a filter')"
      (actionRequested)="filterService.addRule()"
    >
      <div dropdown-items>
        @if (filterService.rules().length === 0) {
          <div class="dd-empty">{{ t('workspace.filter.empty', 'No filters applied') }}</div>
        } @else {
          <div class="filter-rules">
            @for (rule of filterService.rules(); track rule.id; let i = $index) {
              <div class="filter-rule">
                <button class="filter-rule__conj" (click)="toggleConjunction(rule.id)">
                  {{ conjunctionLabel(i, rule.conjunction) }}
                </button>
                <select
                  uiSelectControl
                  uiSelectControlCompact
                  class="filter-rule__select ui-select-control ui-select-control--compact"
                  [value]="rule.property"
                  (change)="updateProperty(rule.id, $any($event.target).value)"
                >
                  <option value="" disabled>
                    {{ t('workspace.filter.property', 'Property') }}
                  </option>
                  @for (prop of propertyOptions(); track prop.id) {
                    <option [value]="prop.id">{{ prop.label }}</option>
                  }
                </select>
                <select
                  uiSelectControl
                  uiSelectControlCompact
                  class="filter-rule__select ui-select-control ui-select-control--compact"
                  [value]="rule.operator"
                  (change)="updateOperator(rule.id, $any($event.target).value)"
                >
                  <option value="" disabled>
                    {{ t('workspace.filter.operator', 'Operator') }}
                  </option>
                  @for (op of getOperatorsForRule(rule.property); track op) {
                    <option [value]="op">{{ operatorLabel(op) }}</option>
                  }
                </select>
                <input
                  uiInputControl
                  uiInputControlCompact
                  class="filter-rule__value ui-input-control ui-input-control--compact"
                  [type]="getInputType(rule.property)"
                  [placeholder]="t('workspace.filter.value.placeholder', 'Value…')"
                  [value]="rule.value"
                  (input)="updateValue(rule.id, $any($event.target).value)"
                />
                <button
                  uiIconButtonGhost
                  uiIconButtonGhostDanger
                  class="filter-rule__remove icon-btn-ghost icon-btn-ghost--danger"
                  (click)="removeRule(rule.id)"
                  [attr.aria-label]="t('workspace.filter.remove.aria', 'Remove filter')"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>
            }
          </div>
        }
      </div>
    </app-standard-dropdown>
  `,
  styleUrl: './filter-dropdown.component.scss',
  imports: [StandardDropdownComponent, ...UI_PRIMITIVE_DIRECTIVES],
})
export class FilterDropdownComponent {
  protected readonly filterService = inject(FilterService);
  private readonly i18nService = inject(I18nService);
  private readonly registry = inject(PropertyRegistryService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly propertyOptionsInput = input<FilterDropdownPropertyOption[] | null>(null);

  readonly propertyOptions = computed(() => {
    const provided = this.propertyOptionsInput();
    if (provided) return provided;

    return this.registry.filterableProperties().map((p) => ({
      id: p.id,
      label: p.label,
      type: p.type,
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

  private getPropertyType(propertyId: string): PropertyType | undefined {
    const provided = this.propertyOptionsInput();
    if (provided) {
      return provided.find((option) => option.id === propertyId)?.type;
    }

    return this.registry.getProperty(propertyId)?.type;
  }
}
