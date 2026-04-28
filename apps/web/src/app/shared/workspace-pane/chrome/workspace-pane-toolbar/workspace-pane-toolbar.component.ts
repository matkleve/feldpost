import { Component } from '@angular/core';
import { PaneToolbarComponent } from '../../../../shared/pane-toolbar/pane-toolbar.component';
import { WorkspaceToolbarComponent } from '../../toolbar/workspace-toolbar/workspace-toolbar.component';

@Component({
  selector: 'app-workspace-pane-toolbar',
  standalone: true,
  imports: [PaneToolbarComponent, WorkspaceToolbarComponent],
  template: `
    <div class="workspace-pane-toolbar">
      <app-pane-toolbar>
        <app-workspace-toolbar slot="left"></app-workspace-toolbar>
      </app-pane-toolbar>
    </div>
  `,
  styleUrl: './workspace-pane-toolbar.component.scss',
})
export class WorkspacePaneToolbarComponent {}
