export type FilterRulePickerField = 'property' | 'operator' | 'value';

export interface OpenFilterRulePicker {
  ruleId: string;
  field: FilterRulePickerField;
}

export interface PickerFlyoutGeom {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}
