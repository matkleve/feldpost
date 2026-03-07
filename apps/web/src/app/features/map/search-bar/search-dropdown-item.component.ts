import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { SearchCandidate } from '../../../core/search/search.models';

@Component({
    selector: 'ss-search-dropdown-item',
    standalone: true,
    imports: [CommonModule],
    template: `
        <button
            class="search-dropdown-item"
            type="button"
            role="option"
            [id]="optionId()"
            [class.search-dropdown-item--active]="active()"
            [attr.aria-selected]="active()"
            (mousedown)="$event.preventDefault()"
            (click)="selected.emit(candidate())"
        >
            <span class="material-icons search-dropdown-item__icon" aria-hidden="true">
                {{ iconName() }}
            </span>

            <span class="search-dropdown-item__content">
                <span class="search-dropdown-item__label">{{ candidate().label }}</span>

                @if (metaText()) {
                    <span class="search-dropdown-item__meta">{{ metaText() }}</span>
                }
            </span>
        </button>
    `,
    styles: [
        `
            .search-dropdown-item {
                display: flex;
                width: 100%;
                min-height: 3rem;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
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

            .search-dropdown-item__icon {
                flex-shrink: 0;
                font-size: 1rem;
                line-height: 1.5rem;
                color: var(--color-text-secondary);
            }

            .search-dropdown-item__content {
                display: flex;
                min-width: 0;
                flex: 1 1 auto;
                flex-direction: column;
                gap: 0.125rem;
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

            .search-dropdown-item__meta {
                color: var(--color-text-secondary);
                font-size: 0.75rem;
                line-height: 1.4;
            }
        `,
    ],
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