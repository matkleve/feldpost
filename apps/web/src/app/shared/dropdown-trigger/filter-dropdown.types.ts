export type FilterRulePickerField = 'property' | 'operator';

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
