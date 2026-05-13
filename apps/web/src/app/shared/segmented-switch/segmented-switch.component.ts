import { Component, computed, input, output } from '@angular/core';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';

import { HLM_TOGGLE_GROUP_IMPORTS } from '../ui/toggle-group';

export interface SegmentedSwitchOption {
  id: string;
  label: string;
  icon?: string;
  type?: 'text-only' | 'icon-only' | 'icon-with-text';
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  inactive?: boolean;
  attention?: boolean;
}

export type SegmentedSwitchSize = 'sm' | 'md' | 'lg';

/**
 * Segmented control: single-select toggle group with optional deselect (`allowDeselect`),
 * inactive strip, and icon/text variants. Backed by `BrnToggleGroup` + local `hlmToggleGroup*`
 * (not `BrnTabs` — tablist/tabpanel semantics do not match this control).
 * @see docs/MIGRATION_PLAN.md
 */
@Component({
  selector: 'app-segmented-switch',
  standalone: true,
  imports: [...BrnToggleGroupImports, ...HLM_TOGGLE_GROUP_IMPORTS],
  templateUrl: './segmented-switch.component.html',
  styleUrl: './segmented-switch.component.scss',
})
export class SegmentedSwitchComponent {
  readonly ariaLabel = input('Segmented switch');
  readonly options = input.required<ReadonlyArray<SegmentedSwitchOption>>();
  readonly value = input<string | null>(null);
  readonly disabled = input(false);
  readonly allowDeselect = input(false);
  readonly sizing = input<'fit' | 'fill'>('fit');
  readonly size = input<SegmentedSwitchSize>('md');

  readonly valueChange = output<string | null>();

  private readonly safeOptions = computed<ReadonlyArray<SegmentedSwitchOption>>(() => {
    try {
      return this.options();
    } catch {
      // Required inputs can be read before binding during test-time initial render.
      return [];
    }
  });

  readonly segmentedOptions = computed(() =>
    this.safeOptions().filter((option) => !option.inactive),
  );
  readonly inactiveOptions = computed(() =>
    this.safeOptions().filter((option) => !!option.inactive),
  );

  resolveType(option: SegmentedSwitchOption): 'text-only' | 'icon-only' | 'icon-with-text' {
    if (option.type) return option.type;
    if (option.icon && option.label) return 'icon-with-text';
    if (option.icon) return 'icon-only';
    return 'text-only';
  }

  onToggleGroupValueChange(raw: ToggleValue<string>): void {
    if (Array.isArray(raw)) {
      return;
    }
    const next = raw === undefined ? null : raw;
    this.valueChange.emit(next);
  }
}
