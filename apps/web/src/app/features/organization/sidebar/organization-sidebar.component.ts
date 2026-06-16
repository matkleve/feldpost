import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PageRailComponent } from '../../../shared/page-rail';
import { PageRailTitleComponent } from '../../../shared/page-rail-title';
import { RailDetailNavItemComponent } from '../../../shared/rail-detail-nav-item';
import type { OrganizationSectionConfig, OrganizationSectionId } from '../page/organization-page.config';

@Component({
  selector: 'app-organization-sidebar',
  standalone: true,
  imports: [PageRailComponent, PageRailTitleComponent, RailDetailNavItemComponent],
  templateUrl: './organization-sidebar.component.html',
  styleUrl: './organization-sidebar.component.scss',
})
export class OrganizationSidebarComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly sections = input<readonly OrganizationSectionConfig[]>([]);
  readonly activeSection = input<OrganizationSectionId>('profile');
  readonly loading = input(false);

  readonly sectionSelected = output<OrganizationSectionId>();
}
