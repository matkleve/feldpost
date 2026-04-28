import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import type { SearchCandidate } from '../../../core/search/search.models';

@Component({
  selector: 'ss-search-dropdown-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-dropdown-item.component.html',
  styleUrl: './search-dropdown-item.component.scss',
})
export class SearchDropdownItemComponent {
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
          ? `${candidate.imageCount} ${candidate.imageCount === 1 ? 'photo' : 'photos'}`
          : '';
      case 'db-content':
        return candidate.subtitle ?? '';
      case 'geocoder':
        return 'External result';
      case 'recent':
        return 'Recent search';
      default:
        return '';
    }
  });
}
