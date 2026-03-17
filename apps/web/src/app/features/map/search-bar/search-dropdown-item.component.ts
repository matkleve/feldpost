import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { SearchCandidate } from '../../../core/search/search.models';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'ss-search-dropdown-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="search-dropdown-item ui-item"
      type="button"
      role="option"
      [id]="optionId()"
      [class.search-dropdown-item--active]="active()"
      [attr.aria-selected]="active()"
      (mousedown)="$event.preventDefault()"
      (click)="selected.emit(candidate())"
    >
      <span class="search-dropdown-item__media ui-item-media" aria-hidden="true">
        <span class="material-icons search-dropdown-item__icon">{{ iconName() }}</span>
      </span>

      <span class="search-dropdown-item__content ui-item-label">
        <span class="search-dropdown-item__label">{{ candidate().label }}</span>

        @if (candidate().secondaryLabel) {
          <span class="search-dropdown-item__secondary">{{ candidate().secondaryLabel }}</span>
        } @else if (metaText()) {
          <span class="search-dropdown-item__meta">{{ metaText() }}</span>
        }
      </span>
    </button>
  `,
  styles: [
    `
      .search-dropdown-item {
        --ui-item-min-height: var(--search-dropdown-item-row-min-height, 3rem);
        --ui-item-padding-inline: var(
          --search-dropdown-item-padding-inline,
          var(--container-padding-inline)
        );
        --ui-item-padding-block: var(
          --search-dropdown-item-padding-block,
          var(--container-padding-block-compact)
        );
        --ui-item-gap: var(--search-dropdown-item-gap, var(--container-gap));
        --ui-item-radius: var(--search-dropdown-item-radius, var(--container-radius-control));
        --ui-item-media-size: var(--search-dropdown-item-media-size, var(--spacing-6));
        --ui-item-content-gap: var(--search-dropdown-item-content-gap, var(--container-gap-panel));

        width: 100%;
        border: 0;
        background: transparent;
        color: var(--color-text-primary);
        text-align: left;
        cursor: pointer;
        transition:
          background-color 120ms ease-in-out,
          color 120ms ease-in-out;
      }

      .search-dropdown-item:hover,
      .search-dropdown-item--active {
        background: color-mix(in srgb, var(--color-clay) 12%, var(--color-bg-elevated));
      }

      .search-dropdown-item__media {
        align-self: start;
      }

      .search-dropdown-item__icon {
        font-size: 1rem;
        line-height: 1.5rem;
        color: var(--color-text-secondary);
      }

      .search-dropdown-item__label,
      .search-dropdown-item__meta {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .search-dropdown-item__label {
        font-size: 0.9375rem;
        line-height: 1.35;
      }

      .search-dropdown-item__secondary {
        color: var(--color-text-secondary);
        font-size: 0.8125rem;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .search-dropdown-item__meta {
        color: var(--color-text-secondary);
        font-size: 0.75rem;
        line-height: 1.4;
      }
    `,
  ],
})
export class SearchDropdownItemComponent {
  private readonly i18nService = inject(I18nService);

  readonly t = this.i18nService.t.bind(this.i18nService);
  readonly candidate = input.required<SearchCandidate>();
  readonly active = input(false);
  readonly optionId = input.required<string>();
  readonly selected = output<SearchCandidate>();

  readonly iconName = computed(() => {
    const candidate = this.candidate();

    switch (candidate.family) {
      case 'db-address':
        return 'location_on';
      case 'db-content':
        switch (candidate.contentType) {
          case 'group':
            return 'folder';
          case 'project':
            return 'workspaces';
          case 'metadata':
            return 'sell';
          case 'photo':
          default:
            return 'photo_camera';
        }
      case 'geocoder':
        return 'public';
      case 'recent':
        return 'history';
      case 'command':
        return 'terminal';
      default:
        return 'search';
    }
  });

  readonly metaText = computed(() => {
    const candidate = this.candidate();

    switch (candidate.family) {
      case 'db-address':
        return typeof candidate.imageCount === 'number'
          ? candidate.imageCount === 1
            ? this.t('map.searchBar.meta.addressPhoto.single', '1 photo')
            : this.t('map.searchBar.meta.addressPhoto.multi', '{count} photos').replace(
                '{count}',
                String(candidate.imageCount),
              )
          : '';
      case 'db-content':
        switch (candidate.contentType) {
          case 'group':
            return this.t('map.searchBar.meta.content.group', 'Saved group');
          case 'project':
            return this.t('map.searchBar.meta.content.project', 'Project');
          case 'metadata':
            return this.t('map.searchBar.meta.content.metadata', 'Metadata');
          case 'photo':
            return this.t('map.searchBar.meta.content.photo', 'Photo');
          default:
            return candidate.subtitle ?? '';
        }
      case 'geocoder':
        return this.t('map.searchBar.meta.externalResult', 'External result');
      case 'recent':
        return this.t('map.searchBar.meta.recentSearch', 'Recent search');
      default:
        return '';
    }
  });
}
