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
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('generates 42 calendar cells by default', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.calendarDays().length).toBe(42);
  });

  it('range mode renders two consecutive month grids', () => {
    fixture.componentRef.setInput('pickMode', 'range');
    fixture.detectChanges();

    expect(fixture.componentInstance.rightCalendarDays().length).toBe(42);
    expect(fixture.componentInstance.rightView().month).toBe(
      (fixture.componentInstance.viewMonth() + 1) % 12,
    );
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
});
