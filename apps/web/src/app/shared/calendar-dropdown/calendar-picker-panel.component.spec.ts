import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarPickerPanelComponent } from './calendar-picker-panel.component';
import { I18nService } from '../../core/i18n/i18n.service';

describe('CalendarPickerPanelComponent', () => {
  let fixture: ComponentFixture<CalendarPickerPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CalendarPickerPanelComponent],
      providers: [
        {
          provide: I18nService,
          useValue: {
            locale: () => 'en-GB',
            t: (_k: string, fb: string) => fb,
            formatDateFieldValue: (date: Date | null) => {
              if (!date) return '';
              const d = String(date.getUTCDate()).padStart(2, '0');
              const m = String(date.getUTCMonth() + 1).padStart(2, '0');
              const y = date.getUTCFullYear();
              return `${d}.${m}.${y}`;
            },
            parseDateFieldValue: (raw: string) => {
              const match = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
              if (!match) return null;
              return new Date(Date.UTC(+match[3], +match[2] - 1, +match[1]));
            },
            dateFieldPlaceholder: () => 'DD.MM.YYYY',
          },
        },
      ],
    });
    fixture = TestBed.createComponent(CalendarPickerPanelComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('generates 42 calendar cells by default', () => {
    expect(fixture.componentInstance.calendarDays().length).toBe(42);
  });

  it('dateOnly hides time row', () => {
    expect(fixture.componentInstance.showTime()).toBe(false);
    expect(fixture.nativeElement.querySelector('.calendar-picker-panel__time-input')).toBeNull();
  });

  it('Enter on date field emits done when draft has date', () => {
    const component = fixture.componentInstance;
    component.dateInput.set('15.06.2025');
    let done = false;
    component.done.subscribe(() => (done = true));
    component.onDateKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(done).toBe(true);
  });

  it('Escape emits cancel', () => {
    const component = fixture.componentInstance;
    let cancelled = false;
    component.cancel.subscribe(() => (cancelled = true));
    component.onDateKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(true);
  });

  it('keeps navigated month after selecting a date', () => {
    fixture.componentRef.setInput('draft', { date: '2026-06-03', time: null });
    fixture.detectChanges();

    expect(fixture.componentInstance.viewMonth()).toBe(5);

    fixture.componentInstance.nextMonth();
    fixture.detectChanges();

    expect(fixture.componentInstance.viewMonth()).toBe(6);

    fixture.componentInstance.prevMonth();
    fixture.componentInstance.prevMonth();
    fixture.detectChanges();

    expect(fixture.componentInstance.viewMonth()).toBe(4);
  });

  it('re-syncs visible month only when draft date changes', () => {
    fixture.componentRef.setInput('draft', { date: '2026-06-03', time: null });
    fixture.detectChanges();
    fixture.componentInstance.nextMonth();
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMonth()).toBe(6);

    fixture.componentRef.setInput('draft', { date: '2026-06-03', time: null });
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMonth()).toBe(6);

    fixture.componentRef.setInput('draft', { date: '2026-08-15', time: null });
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMonth()).toBe(7);
  });
});
