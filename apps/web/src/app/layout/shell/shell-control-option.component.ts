import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { readMotionDurationMs } from './schedule-map-invalidation';
import { goToHoverLabel, type HoverLabelState } from './shell-control-option-state';
import type { ShellControlOptionModel, ShellControlSide } from './shell-control.types';

/** 2.75rem icon button. The label overlays and does not change track size. */
@Component({
  selector: 'app-shell-control-option',
  standalone: true,
  templateUrl: './shell-control-option.component.html',
  styleUrl: './shell-control-option.component.scss',
  host: {
    '[attr.data-state]': 'labelState()',
    '[attr.data-side]': 'side()',
    '[attr.data-active]': 'active()',
    '[attr.data-open]': 'open()',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
  },
})
export class ShellControlOptionComponent {
  private readonly i18n = inject(I18nService);
  protected readonly themeService = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly option = input.required<ShellControlOptionModel>();
  readonly side = input.required<ShellControlSide>();
  readonly active = input(false);
  readonly open = input(false);

  readonly labelState = signal<HoverLabelState>('hidden');

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);

  readonly displayIcon = computed(() => {
    if (this.option().kind !== 'theme') {
      return this.option().icon;
    }
    const mode = this.themeService.mode();
    if (mode === 'dark') return 'dark_mode';
    if (mode === 'sandstone') return 'palette';
    return 'light_mode';
  });

  readonly displayLabel = computed(() => {
    if (this.option().kind !== 'theme') {
      return this.t(this.option().labelKey, this.option().labelFallback);
    }
    const mode = this.themeService.mode();
    if (mode === 'dark') return this.t('shell.control.theme.dark', 'Dark');
    if (mode === 'sandstone') return this.t('shell.control.theme.sandstone', 'Sandstone');
    return this.t('shell.control.theme.light', 'Light');
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  onPointerEnter(): void {
    this.clearTimer();
    const delay = readMotionDurationMs('--motion-duration-hover-label', 1000);
    this.timer = setTimeout(() => {
      this.labelState.set(goToHoverLabel(this.labelState(), 'shown'));
    }, delay);
  }

  onPointerLeave(): void {
    this.clearTimer();
    this.labelState.set(goToHoverLabel(this.labelState(), 'hidden'));
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
