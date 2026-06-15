import { Component } from '@angular/core';
import { InviteManagementSectionComponent } from '../../settings-overlay/sections/invite-management-section.component';

@Component({
  selector: 'app-colleagues-invites-panel',
  standalone: true,
  imports: [InviteManagementSectionComponent],
  template: `<ss-invite-management-section [openContext]="'settings'" />`,
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ColleaguesInvitesPanelComponent {}
