import { Component, computed, inject, input, model, output } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PageRailComponent } from '../../../shared/page-rail';
import { PageRailTitleComponent } from '../../../shared/page-rail-title';
import { RailSectionComponent } from '../../../shared/rail-section';
import { RailSelectListComponent } from '../../../shared/rail-select-list';
import type { RailSelectListItem } from '../../../shared/rail-select-list';
import type { OrganizationSectionConfig, OrganizationSectionId } from '../page/organization-page.config';

@Component({
  selector: 'app-organization-sidebar',
  standalone: true,
  imports: [PageRailComponent, PageRailTitleComponent, RailSectionComponent, RailSelectListComponent],
  templateUrl: './organization-sidebar.component.html',
  styleUrl: './organization-sidebar.component.scss',
})
export class OrganizationSidebarComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly sections = input<readonly OrganizationSectionConfig[]>([]);
  readonly activeSection = input<OrganizationSectionId>('profile');
  readonly loading = input(false);

  readonly sectionSelected = output<OrganizationSectionId>();

  readonly sectionsExpanded = model(true);

  readonly sectionItems = computed<RailSelectListItem[]>(() =>
    this.sections().map((section) => ({
      id: section.id,
      label: this.t(section.labelKey, section.labelFallback),
      secondaryLabel: this.t(section.subtitleKey, section.subtitleFallback),
      leading: { kind: 'icon', name: section.icon },
    })),
  );

  onSectionSelected(id: string): void {
    this.sectionSelected.emit(id as OrganizationSectionId);
  }
}
