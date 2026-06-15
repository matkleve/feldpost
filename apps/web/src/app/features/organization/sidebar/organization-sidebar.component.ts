import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PageRailTitleComponent } from '../../../shared/page-rail-title';
import type { OrganizationSectionConfig, OrganizationSectionId } from '../page/organization-page.config';

@Component({
  selector: 'app-organization-sidebar',
  standalone: true,
  imports: [PageRailTitleComponent],
  templateUrl: './organization-sidebar.component.html',
  styleUrl: './organization-sidebar.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class OrganizationSidebarComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly sections = input<readonly OrganizationSectionConfig[]>([]);
  readonly activeSection = input<OrganizationSectionId>('profile');
  readonly loading = input(false);

  readonly sectionSelected = output<OrganizationSectionId>();
}
