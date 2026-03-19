import { Component, computed, input, output } from '@angular/core';

export interface SegmentedSwitchOption {
  id: string;
  label: string;
  icon?: string;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  inactive?: boolean;
}

@Component({
  selector: 'app-segmented-switch',
  standalone: true,
  templateUrl: './segmented-switch.component.html',
  styleUrl: './segmented-switch.component.scss',
})
export class SegmentedSwitchComponent {
  readonly ariaLabel = input.required<string>();
  readonly options = input.required<ReadonlyArray<SegmentedSwitchOption>>();
  readonly value = input<string | null>(null);
  readonly disabled = input(false);
  readonly allowDeselect = input(false);
  readonly iconOnly = input(false);

  readonly valueChange = output<string | null>();

  readonly segmentedOptions = computed(() => this.options().filter((option) => !option.inactive));
  readonly inactiveOptions = computed(() => this.options().filter((option) => !!option.inactive));

  isSelected(option: SegmentedSwitchOption): boolean {
    return this.value() === option.id;
  }

  selectOption(option: SegmentedSwitchOption): void {
    if (this.disabled() || option.disabled || option.inactive) {
      return;
    }

    const currentlySelected = this.value();
    const next = this.allowDeselect() && currentlySelected === option.id ? null : option.id;
    this.valueChange.emit(next);
  }

  onSegmentedKeydown(event: KeyboardEvent): void {
    if (
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    const container = event.currentTarget as HTMLElement | null;
    if (!container) {
      return;
    }

    const focusableButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.segmented-switch__button:not(:disabled)'),
    );

    if (focusableButtons.length === 0) {
      return;
    }

    event.preventDefault();

    if (event.key === 'Home') {
      focusableButtons[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      focusableButtons[focusableButtons.length - 1]?.focus();
      return;
    }

    const activeIndex = focusableButtons.findIndex((button) => button === document.activeElement);
    const fallbackIndex = event.key === 'ArrowRight' ? -1 : 0;
    const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + delta + focusableButtons.length) % focusableButtons.length;
    focusableButtons[nextIndex]?.focus();
  }
}
