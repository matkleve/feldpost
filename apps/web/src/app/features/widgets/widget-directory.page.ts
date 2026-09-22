import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { addInstalls } from '../../core/widgets/widgets.helpers';
import { WidgetsService } from '../../core/widgets/widgets.service';
import type { WidgetCatalogEntry } from '../../core/widgets/widgets.types';

@Component({
  selector: 'app-widget-directory',
  standalone: true,
  templateUrl: './widget-directory.page.html',
  styleUrl: './widget-directory.page.scss',
})
export class WidgetDirectoryPage {
  private readonly widgets = inject(WidgetsService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  readonly entries = this.widgets.entries();

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);

  openMore(id: string): void {
    void this.router.navigate(['/widgets', id]);
  }

  onAdd(entry: WidgetCatalogEntry): void {
    if (!addInstalls(entry)) return;
  }
}
