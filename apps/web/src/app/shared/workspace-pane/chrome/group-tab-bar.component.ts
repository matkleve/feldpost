import { Component, input, output } from '@angular/core';
import { BrnTabsImports } from '@spartan-ng/brain/tabs';
import { HLM_TABS_IMPORTS } from '../../ui/tabs';

@Component({
  selector: 'app-group-tab-bar',
  imports: [...BrnTabsImports, ...HLM_TABS_IMPORTS],
  template: `
    <div
      hlmTabs
      [brnTabs]="activeTabId()"
      (brnTabsChange)="onBrnTabsChange($event)"
      class="group-tab-bar-root"
    >
      <div brnTabsList hlmTabsList class="group-tab-bar">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            [brnTabsTrigger]="tab.id"
            hlmTabsTrigger
            class="group-tab-bar__tab"
          >
            {{ tab.label }}
          </button>
        }
      </div>
      @for (tab of tabs; track tab.id) {
        <div [brnTabsContent]="tab.id" hlmTabsContent class="sr-only"></div>
      }
    </div>
  `,
  styleUrl: './group-tab-bar.component.scss',
})
export class GroupTabBarComponent {
  readonly tabs = [{ id: 'selection', label: 'Selection' }];
  readonly activeTabId = input<string>('selection');
  readonly tabChange = output<string>();

  onBrnTabsChange(next: string | undefined): void {
    if (next !== undefined) {
      this.tabChange.emit(next);
    }
  }
}
