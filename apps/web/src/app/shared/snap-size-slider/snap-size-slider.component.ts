import { Component, computed, input, output } from '@angular/core';

export interface SnapSizeSliderOption {
  value: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-snap-size-slider',
  standalone: true,
  templateUrl: './snap-size-slider.component.html',
  styleUrl: './snap-size-slider.component.scss',
})
export class SnapSizeSliderComponent {
  readonly label = input('View mode');
  readonly options = input.required<ReadonlyArray<SnapSizeSliderOption>>();
  readonly value = input.required<string>();

  readonly valueChange = output<string>();

  readonly valueText = computed(() => {
    const option = this.options().find((item) => item.value === this.value());
    return option?.label ?? this.label();
  });

  select(value: string): void {
    const option = this.options().find((item) => item.value === value);
    if (!option || option.value === this.value()) return;
    this.valueChange.emit(option.value);
  }
}
