import { Component, input, output } from '@angular/core';
import { UiTabDirective, UiTabListDirective } from '../../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-group-tab-bar',
  imports: [UiTabListDirective, UiTabDirective],
  template: `
    <div uiTabList class="group-tab-bar ui-tab-list" role="tablist">
      @for (tab of tabs; track tab.id) {
        <button
          uiTab
          class="group-tab-bar__tab"
          role="tab"
          [class.group-tab-bar__tab--active]="tab.id === activeTabId()"
          [attr.aria-selected]="tab.id === activeTabId()"
          (click)="tabChange.emit(tab.id)"
        >
          {{ tab.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './group-tab-bar.component.scss',
})
export class GroupTabBarComponent {
  readonly tabs = [{ id: 'selection', label: 'Selection' }];
  readonly activeTabId = input<string>('selection');
  readonly tabChange = output<string>();
}

