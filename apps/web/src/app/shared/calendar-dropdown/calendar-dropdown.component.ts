import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { parseIsoDateValue, toIsoDateValue } from '../../core/i18n/date-field.helpers';
import { I18nService } from '../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../dropdown-trigger/shell/dropdown-shell.component';
import { CalendarPickerPanelComponent } from './calendar-picker-panel.component';
import type {
  CalendarDropdownValue,
  CalendarRangeValue,
  RangeAnchorTarget,
  TimeMode,
} from './calendar-dropdown.types';

@Component({
  selector: 'app-calendar-dropdown',
  standalone: true,
  imports: [DropdownShellComponent, CalendarPickerPanelComponent],
  templateUrl: './calendar-dropdown.component.html',
  styleUrl: './calendar-dropdown.component.scss',
})
export class CalendarDropdownComponent {
  protected readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // ── Mode ─────────────────────────────────────────────────────────────────
  readonly mode = input<'single' | 'range'>('single');

  // ── Single mode API ───────────────────────────────────────────────────────
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly value = input<CalendarDropdownValue | null>(null);
  readonly timeMode = input<TimeMode>('dateOnly');
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly disabledDates = input<ReadonlySet<string> | null>(null);
  readonly nullable = input(true);

  readonly valueChange = output<CalendarDropdownValue | null>();

  // ── Range mode API ────────────────────────────────────────────────────────
  readonly fromLabel = input('');
  readonly toLabel = input('');
  readonly rangeValue = input<CalendarRangeValue | null>(null);
  readonly rangeChange = output<CalendarRangeValue | null>();

  // ── Popover state (shared) ────────────────────────────────────────────────
  readonly popoverOpen = signal(false);

  // ── Single mode draft ─────────────────────────────────────────────────────
  readonly draft = signal<CalendarDropdownValue | null>(null);

  // ── Range mode draft + FSM ────────────────────────────────────────────────
  readonly rangeDraft = signal<CalendarRangeValue | null>(null);
  readonly anchorTarget = signal<RangeAnchorTarget>('pick');

  // ── Anchor elements ───────────────────────────────────────────────────────
  private readonly controlRef = viewChild<ElementRef<HTMLElement>>('control');
  private readonly fromControlRef = viewChild<ElementRef<HTMLElement>>('fromControl');
  private readonly toControlRef = viewChild<ElementRef<HTMLElement>>('toControl');

  readonly anchorEl = computed(() => {
    if (this.mode() === 'range') {
      const anchor = this.anchorTarget();
      return anchor === 'to'
        ? (this.toControlRef()?.nativeElement ?? null)
        : (this.fromControlRef()?.nativeElement ?? null);
    }
    return this.controlRef()?.nativeElement ?? null;
  });

  // ── Display text computeds ────────────────────────────────────────────────
  readonly shellDisplayText = computed(() => {
    const dateIso = this.value()?.date;
    if (!dateIso) return '';
    const parsed = parseIsoDateValue(dateIso);
    return parsed ? this.i18nService.formatDateFieldValue(parsed) : '';
  });

  readonly fromShellText = computed(() => {
    const d = this.rangeValue()?.from?.date;
    if (!d) return '';
    const parsed = parseIsoDateValue(d);
    return parsed ? this.i18nService.formatDateFieldValue(parsed) : '';
  });

  readonly toShellText = computed(() => {
    const d = this.rangeValue()?.to?.date;
    if (!d) return '';
    const parsed = parseIsoDateValue(d);
    return parsed ? this.i18nService.formatDateFieldValue(parsed) : '';
  });

  readonly placeholder = computed(() => this.i18nService.dateFieldPlaceholder());

  // ── Single mode actions ───────────────────────────────────────────────────

  openIfClosed(): void {
    if (!this.popoverOpen()) {
      this.draft.set(this.cloneValue(this.value()));
      this.popoverOpen.set(true);
    }
  }

  togglePopover(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.popoverOpen()) {
      this.closePopover(false);
      return;
    }

    this.draft.set(this.cloneValue(this.value()));
    this.popoverOpen.set(true);
  }

  onPopoverCloseRequested(): void {
    this.closePopover(false);
  }

  onDraftChange(next: CalendarDropdownValue | null): void {
    this.draft.set(next);
  }

  onPanelDone(): void {
    const next = this.normalizeDraft(this.draft());
    if (!this.isDraftValid(next)) return;
    this.valueChange.emit(next);
    this.closePopover(true);
  }

  onPanelClear(): void {
    this.valueChange.emit(null);
    this.closePopover(true);
  }

  onShellTextCommit(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = this.i18nService.parseDateFieldValue(raw);
    const date = parsed ? toIsoDateValue(parsed) : null;
    const time = this.timeMode() === 'dateOnly' ? null : (this.value()?.time ?? null);

    if (!date && !time) {
      this.valueChange.emit(null);
      return;
    }
    this.valueChange.emit({ date, time });
  }

  // ── Range mode actions ────────────────────────────────────────────────────

  openRangeIfClosed(field: 'from' | 'to'): void {
    if (this.popoverOpen()) return;
    this.anchorTarget.set(this.resolveRangeAnchor(field));
    this.rangeDraft.set(this.cloneRangeValue(this.rangeValue()));
    this.popoverOpen.set(true);
  }

  toggleRangePopover(event: MouseEvent, field: 'from' | 'to'): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.popoverOpen()) {
      this.closePopover(false);
      return;
    }

    this.anchorTarget.set(this.resolveRangeAnchor(field));
    this.rangeDraft.set(this.cloneRangeValue(this.rangeValue()));
    this.popoverOpen.set(true);
  }

  onRangeDraftChange(next: CalendarRangeValue | null): void {
    this.rangeDraft.set(next);
  }

  onRangePanelDone(): void {
    const draft = this.rangeDraft();
    this.rangeChange.emit(draft);
    this.closePopover(true);
  }

  onRangePanelClear(): void {
    this.rangeChange.emit(null);
    this.closePopover(true);
  }

  onFromShellTextCommit(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = this.i18nService.parseDateFieldValue(raw);
    const date = parsed ? toIsoDateValue(parsed) : null;
    const current = this.rangeValue();
    this.rangeChange.emit({ from: date ? { date, time: null } : null, to: current?.to ?? null });
  }

  onToShellTextCommit(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = this.i18nService.parseDateFieldValue(raw);
    const date = parsed ? toIsoDateValue(parsed) : null;
    const current = this.rangeValue();
    this.rangeChange.emit({ from: current?.from ?? null, to: date ? { date, time: null } : null });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private closePopover(_committed: boolean): void {
    this.popoverOpen.set(false);
    this.draft.set(null);
    this.rangeDraft.set(null);
  }

  private resolveRangeAnchor(field: 'from' | 'to'): RangeAnchorTarget {
    const rv = this.rangeValue();
    // No range yet → two-click 'pick' flow
    if (!rv?.from?.date && !rv?.to?.date) return 'pick';
    return field;
  }

  private cloneValue(value: CalendarDropdownValue | null): CalendarDropdownValue | null {
    if (!value) return null;
    return { date: value.date, time: value.time };
  }

  private cloneRangeValue(value: CalendarRangeValue | null): CalendarRangeValue | null {
    if (!value) return null;
    return {
      from: value.from ? { date: value.from.date, time: value.from.time } : null,
      to: value.to ? { date: value.to.date, time: value.to.time } : null,
    };
  }

  private normalizeDraft(draft: CalendarDropdownValue | null): CalendarDropdownValue | null {
    if (!draft?.date && !draft?.time) return null;
    if (this.timeMode() === 'dateOnly') return draft?.date ? { date: draft.date, time: null } : null;
    return draft;
  }

  private isDraftValid(draft: CalendarDropdownValue | null): boolean {
    if (!draft?.date) return this.nullable();
    return true;
  }
}
