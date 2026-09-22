import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { overviewState } from '../../core/widgets/widgets.helpers';
import { WidgetsService } from '../../core/widgets/widgets.service';
import type { WidgetCatalogEntry } from '../../core/widgets/widgets.types';

@Component({
  selector: 'app-widget-overview',
  standalone: true,
  templateUrl: './widget-overview.page.html',
  styleUrl: './widget-overview.page.scss',
})
export class WidgetOverviewPage {
  private readonly widgets = inject(WidgetsService);
  private readonly i18n = inject(I18nService);

  readonly rows = this.widgets.entries();

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);

  stateOf(entry: WidgetCatalogEntry): 'on-rail' | 'not-added' {
    return overviewState(entry);
  }

  stateKey(entry: WidgetCatalogEntry): string {
    return this.stateOf(entry) === 'on-rail'
      ? 'widget.overview.state.onRail'
      : 'widget.overview.state.notAdded';
  }

  stateFallback(entry: WidgetCatalogEntry): string {
    return this.stateOf(entry) === 'on-rail' ? 'On the rail' : 'Not added';
  }
}
