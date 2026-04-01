import { Injectable } from '@angular/core';
import type {
  ActionDefinition,
  ActionSection,
  ResolveActionsOptions,
  ResolvedAction,
} from './action-types';

const SECTION_ORDER: Record<ActionSection, number> = {
  primary: 0,
  secondary: 1,
  destructive: 2,
};

@Injectable({ providedIn: 'root' })
export class ActionEngineService {
  resolveActions<TContext, TActionId extends string>(
    definitions: ReadonlyArray<ActionDefinition<TContext, TActionId>>,
    context: TContext,
    options?: ResolveActionsOptions,
  ): ReadonlyArray<ResolvedAction<TActionId>> {
    const resolved = definitions
      .filter((definition) => definition.visibleWhen(context))
      .map<ResolvedAction<TActionId>>((definition) => ({
        id: definition.id,
        section: definition.section,
        priority: definition.priority,
        icon: definition.icon,
        label: options?.translateLabel
          ? options.translateLabel(definition.labelKey ?? definition.fallbackLabel)
          : definition.fallbackLabel,
        disabled: definition.enabledWhen ? !definition.enabledWhen(context) : false,
      }))
      .sort((left, right) => {
        const sectionDelta = SECTION_ORDER[left.section] - SECTION_ORDER[right.section];
        if (sectionDelta !== 0) {
          return sectionDelta;
        }

        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }

        return left.label.localeCompare(right.label);
      });

    return resolved;
  }
}
