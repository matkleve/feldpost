import { Component, input, output, viewChild } from '@angular/core';
import { InviteEditorPanelComponent } from '../../colleagues/invites/invite-editor-panel/invite-editor-panel.component';
import type { InviteOpenContext, InviteTargetRole } from '../../../core/invites/invites.types';

@Component({
  selector: 'ss-invite-management-section',
  standalone: true,
  imports: [InviteEditorPanelComponent],
  template: `
    <app-invite-editor-panel
      #editor
      [manageOwnDraft]="true"
      [openContext]="openContext()"
      [preselectedRole]="preselectedRole()"
      [requestToken]="requestToken()"
      (inviteCreated)="inviteCreated.emit($event)"
      (inviteRevoked)="inviteRevoked.emit($event)"
    />
  `,
  styleUrl: './invite-management-section.component.scss',
})
export class InviteManagementSectionComponent {
  private readonly editor = viewChild<InviteEditorPanelComponent>('editor');

  readonly openContext = input<InviteOpenContext>('settings');
  readonly preselectedRole = input<InviteTargetRole>('worker');
  readonly requestToken = input(0);

  readonly inviteCreated = output<string>();
  readonly inviteRevoked = output<string>();

  panelMode() {
    return this.editor()?.panelMode() ?? 'ready';
  }
}
