/**
 * Minimal project ↔ location linker for upload tier-3 / Branch B bias.
 * @see docs/specs/component/project/project-location-picker.md
 */

import { Component, effect, inject, input, signal } from '@angular/core';
import { MediaLocationsService } from '../../core/media-locations/media-locations.service';
import { locationPinEligible } from '../../core/media-locations/media-locations.helpers';
import { ProjectsService } from '../../core/projects/projects.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';

interface ProjectLocationRowView {
  linkId: string;
  locationId: string;
  addressLabel: string;
  pinEligible: boolean;
}

@Component({
  selector: 'app-project-location-picker',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  template: `
    @if (projectId()) {
      <section class="project-location-picker" [attr.aria-label]="t('project.location.picker.aria', 'Project locations')">
        <h3 class="project-location-picker__title">
          {{ t('project.location.picker.title', 'Project locations') }}
        </h3>
        @if (rows().length === 0) {
          <p class="project-location-picker__empty">
            {{ t('project.location.picker.empty', 'No locations linked yet.') }}
          </p>
        } @else {
          <ul class="project-location-picker__list">
            @for (row of rows(); track row.locationId) {
              <li class="project-location-picker__item">
                <span>{{ row.addressLabel }}</span>
                @if (!row.pinEligible) {
                  <span class="project-location-picker__hint">{{
                    t('project.location.picker.noPin', 'No map pin')
                  }}</span>
                }
                <button type="button" hlmBtn variant="ghost" size="sm" (click)="remove(row.locationId)">
                  {{ t('project.location.picker.remove', 'Remove') }}
                </button>
              </li>
            }
          </ul>
        }
        <button type="button" hlmBtn variant="outline" size="sm" [disabled]="adding()" (click)="addSample()">
          {{ t('project.location.picker.add', 'Add location') }}
        </button>
      </section>
    }
  `,
  styles: `
    .project-location-picker {
      margin-block: 0.75rem;
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    .project-location-picker__title {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .project-location-picker__list {
      list-style: none;
      margin: 0 0 0.5rem;
      padding: 0;
    }
    .project-location-picker__item {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.8125rem;
    }
    .project-location-picker__hint {
      color: var(--muted-foreground);
      font-size: 0.75rem;
    }
    .project-location-picker__empty {
      margin: 0 0 0.5rem;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }
  `,
})
export class ProjectLocationPickerComponent {
  readonly projectId = input<string | null>(null);

  private readonly projects = inject(ProjectsService);
  private readonly mediaLocations = inject(MediaLocationsService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t.bind(this.i18n);
  readonly rows = signal<ProjectLocationRowView[]>([]);
  readonly adding = signal(false);

  constructor() {
    effect(() => {
      const id = this.projectId();
      if (id) {
        void this.reload(id);
      } else {
        this.rows.set([]);
      }
    });
  }

  private async reload(projectId: string): Promise<void> {
    const list = await this.projects.loadProjectLocations(projectId);
    this.rows.set(
      list.map((row) => ({
        linkId: row.linkId,
        locationId: row.locationId,
        addressLabel: row.addressLabel || [row.street, row.city].filter(Boolean).join(', '),
        pinEligible: locationPinEligible({
          street: row.street,
          latitude: row.latitude,
          longitude: row.longitude,
        }),
      })),
    );
  }

  async remove(locationId: string): Promise<void> {
    const id = this.projectId();
    if (!id) {
      return;
    }
    await this.projects.unlinkProjectLocation(id, locationId);
    await this.reload(id);
  }

  /** MVP: prompt for address string and geocode via media locations find_or_create path. */
  async addSample(): Promise<void> {
    const id = this.projectId();
    if (!id || this.adding()) {
      return;
    }
    const raw = window.prompt(
      this.t('project.location.picker.prompt', 'Enter address (e.g. Mariahilf, Wien)'),
    );
    if (!raw?.trim()) {
      return;
    }
    this.adding.set(true);
    try {
      const locationId = await this.mediaLocations.findOrCreateFromAddressLabel(raw.trim());
      if (locationId) {
        await this.projects.linkProjectLocation(id, locationId);
        await this.reload(id);
      }
    } finally {
      this.adding.set(false);
    }
  }
}
