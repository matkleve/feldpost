import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { I18nService } from '../../core/i18n/i18n.service';
import { WidgetsService } from '../../core/widgets/widgets.service';

@Component({
  selector: 'app-widget-explanation',
  standalone: true,
  templateUrl: './widget-explanation.page.html',
  styleUrl: './widget-explanation.page.scss',
})
export class WidgetExplanationPage {
  private readonly widgets = inject(WidgetsService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  private readonly widgetId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('widgetId') ?? '')),
    { initialValue: '' },
  );

  readonly entry = computed(() => this.widgets.find(this.widgetId()));

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);

  back(): void {
    void this.router.navigateByUrl('/widgets');
  }
}
