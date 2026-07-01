import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../dropdown-trigger/shell/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { parseTimeInput } from '../ui-primitives/parse-time-input';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

@Component({
  selector: 'app-time-field-control',
  standalone: true,
  imports: [DropdownShellComponent, DecimalPipe, ...HLM_BUTTON_IMPORTS],
  templateUrl: './time-field-control.component.html',
  styleUrl: './time-field-control.component.scss',
})
export class TimeFieldControlComponent {
  protected readonly i18nService = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly value = input<string | null>(null);
  readonly ariaLabel = input('');
  readonly disabled = input(false);

  readonly valueChange = output<string | null>();

  readonly popoverOpen = signal(false);
  readonly hours = HOURS;
  readonly minutes = MINUTES;

  private readonly controlRef = viewChild<ElementRef<HTMLElement>>('control');
  private readonly hourWheelRef = viewChild<ElementRef<HTMLElement>>('hourWheel');
  private readonly minuteWheelRef = viewChild<ElementRef<HTMLElement>>('minuteWheel');

  private wheelScrollUnbind: (() => void) | null = null;
  // Wheels mid-flight from our own `scrollWheelToValue()` smooth-scroll (click,
  // focus-open, typed commit) — live scroll-sync ignores these so it doesn't
  // emit every intermediate row the animation passes through.
  private readonly settlingWheels = new Set<HTMLElement>();

  constructor() {
    effect(() => {
      const open = this.popoverOpen();
      untracked(() => {
        if (!open) {
          this.unbindWheelScrollSync();
          return;
        }
        afterNextRender(() => this.bindWheelScrollSync());
      });
    });

    this.destroyRef.onDestroy(() => this.unbindWheelScrollSync());
  }

  readonly shellText = computed(() => this.value() ?? '');

  readonly selectedHour = computed(() => {
    const parsed = parseTimeInput(this.value() ?? '');
    if (!parsed) return 0;
    return parseInt(parsed.slice(0, 2), 10);
  });

  readonly selectedMinute = computed(() => {
    const parsed = parseTimeInput(this.value() ?? '');
    if (!parsed) return 0;
    return parseInt(parsed.slice(3, 5), 10);
  });

  readonly anchorEl = computed(() => this.controlRef()?.nativeElement ?? null);

  onFocus(): void {
    if (this.disabled()) return;
    this.popoverOpen.set(true);
    queueMicrotask(() => this.scrollWheelsToSelection());
  }

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const normalized = this.normalizeTime(raw);
    this.valueChange.emit(normalized);
    if (!normalized) return;
    const hour = parseInt(normalized.slice(0, 2), 10);
    const minute = parseInt(normalized.slice(3, 5), 10);
    queueMicrotask(() => this.scrollWheelsToSelection(hour, minute));
  }

  onCommit(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const normalized = this.normalizeTime(raw);
    this.valueChange.emit(normalized);
    if (normalized) {
      (event.target as HTMLInputElement).value = normalized;
    }
    this.popoverOpen.set(false);
  }

  onPopoverCloseRequested(): void {
    this.popoverOpen.set(false);
  }

  // Stable state: one-click destructive action — clears the value immediately,
  // no arm/confirm step (unlike `TwoStepConfirmInteraction`); low-stakes and
  // reversible (user can just pick a new time), so a confirm dialog is overkill.
  // @see docs/specs/component/filters/time-field-control.md#actions
  onRemoveClick(): void {
    if (!this.value()) return;
    this.valueChange.emit(null);
    this.popoverOpen.set(false);
  }

  selectHour(hour: number): void {
    this.emitTime(hour, this.selectedMinute());
  }

  selectMinute(minute: number): void {
    this.emitTime(this.selectedHour(), minute);
  }

  onWheelItemActivate(event: PointerEvent, kind: 'hour' | 'minute', value: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (kind === 'hour') {
      this.selectHour(value);
      return;
    }
    this.selectMinute(value);
  }

  // Stable state: wheels scroll natively (touch/trackpad/mouse); whichever row
  // sits under the center marker is promoted to the active value on every
  // scroll frame, so dragging/scrolling already previews the value live.
  // @see docs/specs/component/filters/time-field-control.md#actions
  private bindWheelScrollSync(): void {
    this.unbindWheelScrollSync();

    const hourUnbind = this.bindWheelScrollListener(this.hourWheelRef(), 'hour');
    const minuteUnbind = this.bindWheelScrollListener(this.minuteWheelRef(), 'minute');
    this.wheelScrollUnbind = () => {
      hourUnbind?.();
      minuteUnbind?.();
    };
  }

  private unbindWheelScrollSync(): void {
    this.wheelScrollUnbind?.();
    this.wheelScrollUnbind = null;
  }

  private bindWheelScrollListener(
    wheelRef: ElementRef<HTMLElement> | undefined,
    kind: 'hour' | 'minute',
  ): (() => void) | null {
    const wheel = wheelRef?.nativeElement;
    if (!wheel) return null;

    let pendingFrame: number | null = null;
    const handler = (): void => {
      if (pendingFrame !== null) return;
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;
        if (this.settlingWheels.has(wheel)) return;
        this.syncActiveValueFromScroll(wheel, kind);
      });
    };

    wheel.addEventListener('scroll', handler, { passive: true });
    return () => {
      wheel.removeEventListener('scroll', handler);
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    };
  }

  private syncActiveValueFromScroll(wheel: HTMLElement, kind: 'hour' | 'minute'): void {
    const centerY = wheel.scrollTop + wheel.clientHeight / 2;
    let closestValue = 0;
    let closestDistance = Infinity;

    for (const item of Array.from(wheel.children) as HTMLElement[]) {
      const itemCenter = item.offsetTop + item.offsetHeight / 2;
      const distance = Math.abs(itemCenter - centerY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestValue = Number(item.dataset['wheelValue']);
      }
    }

    const current = kind === 'hour' ? this.selectedHour() : this.selectedMinute();
    if (closestValue === current) return;

    const hour = kind === 'hour' ? closestValue : this.selectedHour();
    const minute = kind === 'minute' ? closestValue : this.selectedMinute();
    // Scroll position already reflects this value (it's the scroll that
    // drove the change) — only emit, do not re-scroll and fight the gesture.
    this.valueChange.emit(this.formatTime(hour, minute));
  }

  private emitTime(hour: number, minute: number): void {
    this.valueChange.emit(this.formatTime(hour, minute));
    queueMicrotask(() => this.scrollWheelsToSelection(hour, minute));
  }

  private formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private normalizeTime(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parsed = parseTimeInput(trimmed);
    return parsed || null;
  }

  private scrollWheelsToSelection(
    hour = this.selectedHour(),
    minute = this.selectedMinute(),
  ): void {
    this.scrollWheelToValue(this.hourWheelRef(), hour);
    this.scrollWheelToValue(this.minuteWheelRef(), minute);
  }

  private scrollWheelToValue(wheelRef: ElementRef<HTMLElement> | undefined, value: number): void {
    const wheel = wheelRef?.nativeElement;
    if (!wheel) return;
    const item = wheel.querySelector<HTMLElement>(`[data-wheel-value="${value}"]`);
    if (!item) return;
    const offset = item.offsetTop - wheel.clientHeight / 2 + item.offsetHeight / 2;
    const target = Math.max(0, offset);
    if (wheel.scrollTop === target) return;
    this.markWheelSettling(wheel);
    wheel.scrollTop = target;
  }

  private markWheelSettling(wheel: HTMLElement): void {
    this.settlingWheels.add(wheel);
    const clear = () => this.settlingWheels.delete(wheel);
    if ('onscrollend' in wheel) {
      wheel.addEventListener('scrollend', clear, { once: true });
      return;
    }
    setTimeout(clear, 400);
  }
}
