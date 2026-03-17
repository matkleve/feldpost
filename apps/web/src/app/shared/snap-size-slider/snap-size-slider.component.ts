import { Component, computed, input, output } from '@angular/core';

export interface SnapSizeSliderOption {
  value: string;
  label: string;
  shortLabel?: string;
  icon?: string;
}

@Component({
  selector: 'app-snap-size-slider',
  templateUrl: './snap-size-slider.component.html',
  styleUrl: './snap-size-slider.component.scss',
})
export class SnapSizeSliderComponent {
  readonly label = input('Thumbnail size');
  readonly options = input.required<ReadonlyArray<SnapSizeSliderOption>>();
  readonly value = input.required<string>();

  readonly valueChange = output<string>();

  readonly selectedIndex = computed(() => {
    const idx = this.options().findIndex((option) => option.value === this.value());
    return idx >= 0 ? idx : 0;
  });

  readonly maxIndex = computed(() => Math.max(0, this.options().length - 1));

  readonly valueText = computed(() => {
    const option = this.options()[this.selectedIndex()];
    return option?.label ?? this.label();
  });

  readonly selectedIcon = computed(() => {
    const option = this.options()[this.selectedIndex()];
    return option?.icon ?? null;
  });

  onRangeInput(event: Event): void {
    const nextIndex = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this.selectIndex(nextIndex);
  }

  selectIndex(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.maxIndex()));
    const option = this.options()[clamped];
    if (!option || option.value === this.value()) return;
    this.valueChange.emit(option.value);
  }
}
