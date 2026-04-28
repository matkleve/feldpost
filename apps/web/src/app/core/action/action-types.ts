export type ActionSection = 'primary' | 'secondary' | 'destructive';

export interface ActionDefinition<TContext, TActionId extends string = string> {
  id: TActionId;
  section: ActionSection;
  priority: number;
  icon: string;
  fallbackLabel: string;
  labelKey?: string;
  visibleWhen: (context: TContext) => boolean;
  enabledWhen?: (context: TContext) => boolean;
}

export interface ResolvedAction<TActionId extends string = string> {
  id: TActionId;
  section: ActionSection;
  priority: number;
  icon: string;
  label: string;
  disabled: boolean;
}

export interface ResolveActionsOptions {
  translateLabel?: (fallbackLabel: string) => string;
}
