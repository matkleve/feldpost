import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-standard-dropdown',
  standalone: true,
  template: `
    <div class="standard-dropdown">
      @if (showSearch()) {
        <div class="dd-search">
          <input
            class="dd-search__input"
            type="text"
            [placeholder]="searchPlaceholder()"
            [value]="searchTerm()"
            (input)="searchTermChange.emit($any($event.target).value)"
          />

          @if (showDefaultClearAction() && searchTerm()) {
            <button
              class="dd-search__action"
              type="button"
              [attr.aria-label]="clearSearchAriaLabel()"
              (click)="clearRequested.emit()"
            >
              <span class="material-icons" aria-hidden="true">close</span>
            </button>
          }

          <ng-content select="[dropdown-search-action]" />
        </div>
      }

      <div [class]="itemsHostClass()">
        <ng-content select="[dropdown-items]" />
      </div>

      @if (actionLabel()) {
        <button class="dd-action-row" type="button" (click)="actionRequested.emit()">
          <span class="material-icons" aria-hidden="true">{{ actionIcon() }}</span>
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 0;
      }

      .standard-dropdown {
        display: flex;
        flex-direction: column;
        max-height: inherit;
        min-height: 0;
      }

      .standard-dropdown .dd-items {
        min-height: 0;
        overflow-y: auto;
      }
    `,
  ],
})
export class StandardDropdownComponent {
  readonly showSearch = input(true);
  readonly searchPlaceholder = input('Search...');
  readonly searchTerm = input('');
  readonly showDefaultClearAction = input(true);
  readonly clearSearchAriaLabel = input('Clear search');
  readonly itemsClass = input('');

  readonly actionLabel = input<string | null>(null);
  readonly actionIcon = input('add');

  readonly searchTermChange = output<string>();
  readonly clearRequested = output<void>();
  readonly actionRequested = output<void>();

  itemsHostClass(): string {
    const extra = this.itemsClass().trim();
    return extra ? `dd-items ${extra}` : 'dd-items';
  }
}
