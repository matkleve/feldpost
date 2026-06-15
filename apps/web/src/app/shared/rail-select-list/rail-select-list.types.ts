export type RailSelectListLeading =
  | { kind: 'dot'; color: string }
  | { kind: 'avatar'; text: string; online?: boolean }
  | { kind: 'icon'; name: string }
  | { kind: 'none' };

export interface RailSelectListButtonAction {
  id: string;
  icon: string;
  ariaLabel: string;
  title?: string;
}

export interface RailSelectListConfirmAction {
  id: string;
  idleIcon: string;
  armedIcon: string;
  initialAriaKey: string;
  initialAriaFallback: string;
  initialTitleKey?: string;
  initialTitleFallback?: string;
  confirmAriaKey?: string;
  confirmAriaFallback?: string;
  tone?: 'danger' | 'remove';
}

export type RailSelectListRowAction =
  | { type: 'button'; action: RailSelectListButtonAction }
  | { type: 'confirm'; action: RailSelectListConfirmAction };

export interface RailSelectListItem {
  id: string;
  label: string;
  secondaryLabel?: string;
  secondaryColor?: string | null;
  badge?: number;
  leading?: RailSelectListLeading;
  actions?: RailSelectListRowAction[];
}

export interface RailSelectListActionEvent {
  itemId: string;
  actionId: string;
}
