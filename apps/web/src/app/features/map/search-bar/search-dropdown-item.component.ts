import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
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
  readonly optionId = input<string>('search-option');
  readonly selected = output<SearchCandidate>();

  iconName(candidate: SearchCandidate): string {
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
      case 'operator-suggestion':
        return 'tag';
      default:
        return 'search';
    }
  }

  metaText(candidate: SearchCandidate): string {
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
        return '';
      case 'operator-suggestion':
        return candidate.secondaryLabel ?? '';
      default:
        return '';
    }
  }
}
