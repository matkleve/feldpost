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
import { parseTimeInput } from '../ui-primitives/parse-time-input';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

@Component({
  selector: 'app-time-field-control',
  standalone: true,
  imports: [DropdownShellComponent, DecimalPipe],
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
  private readonly pickerRef = viewChild<ElementRef<HTMLElement>>('picker');
  private readonly hourWheelRef = viewChild<ElementRef<HTMLElement>>('hourWheel');
  private readonly minuteWheelRef = viewChild<ElementRef<HTMLElement>>('minuteWheel');

  private wheelUnbind: (() => void) | null = null;

  constructor() {
    effect(() => {
      const open = this.popoverOpen();
      untracked(() => {
        if (!open) {
          this.unbindPickerWheelListener();
          return;
        }
        afterNextRender(() => this.bindPickerWheelListener());
      });
    });

    this.destroyRef.onDestroy(() => this.unbindPickerWheelListener());
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
    this.valueChange.emit(this.normalizeTime(raw));
    queueMicrotask(() => this.scrollWheelsToSelection());
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

  private onPickerWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const picker = this.pickerRef()?.nativeElement;
    if (!picker) {
      return;
    }

    const midX = picker.getBoundingClientRect().left + picker.clientWidth / 2;
    const delta = event.deltaY > 0 ? 1 : -1;

    if (event.clientX < midX) {
      const next = this.wrapHour(this.selectedHour() + delta);
      this.emitTime(next, this.selectedMinute());
      this.scrollWheelToValue(this.hourWheelRef(), next);
      return;
    }

    const next = this.wrapMinute(this.selectedMinute() + delta);
    this.emitTime(this.selectedHour(), next);
    this.scrollWheelToValue(this.minuteWheelRef(), next);
  }

  private bindPickerWheelListener(): void {
    this.unbindPickerWheelListener();

    const picker = this.pickerRef()?.nativeElement;
    if (!picker) {
      return;
    }

    const handler = (event: WheelEvent) => this.onPickerWheel(event);
    picker.addEventListener('wheel', handler, { passive: false });
    this.wheelUnbind = () => picker.removeEventListener('wheel', handler);
  }

  private unbindPickerWheelListener(): void {
    this.wheelUnbind?.();
    this.wheelUnbind = null;
  }

  private emitTime(hour: number, minute: number): void {
    const next = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    this.valueChange.emit(next);
    queueMicrotask(() => this.scrollWheelsToSelection());
  }

  private normalizeTime(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parsed = parseTimeInput(trimmed);
    return parsed || null;
  }

  private wrapHour(value: number): number {
    if (value < 0) return 23;
    if (value > 23) return 0;
    return value;
  }

  private wrapMinute(value: number): number {
    if (value < 0) return 59;
    if (value > 59) return 0;
    return value;
  }

  private scrollWheelsToSelection(): void {
    this.scrollWheelToValue(this.hourWheelRef(), this.selectedHour());
    this.scrollWheelToValue(this.minuteWheelRef(), this.selectedMinute());
  }

  private scrollWheelToValue(wheelRef: ElementRef<HTMLElement> | undefined, value: number): void {
    const wheel = wheelRef?.nativeElement;
    if (!wheel) return;
    const item = wheel.querySelector<HTMLElement>(`[data-wheel-value="${value}"]`);
    if (!item) return;
    const offset = item.offsetTop - wheel.clientHeight / 2 + item.offsetHeight / 2;
    wheel.scrollTop = Math.max(0, offset);
  }
}
