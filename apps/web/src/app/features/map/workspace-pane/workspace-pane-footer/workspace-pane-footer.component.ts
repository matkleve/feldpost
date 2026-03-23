import { Component, input } from '@angular/core';
import type { WorkspaceImage } from '../../../../core/workspace-view.types';
import { PaneFooterComponent } from '../../../../shared/pane-footer/pane-footer.component';
import { WorkspaceExportBarComponent } from '../workspace-export-bar.component';

@Component({
  selector: 'app-workspace-pane-footer',
  standalone: true,
  imports: [PaneFooterComponent, WorkspaceExportBarComponent],
  template: `
    <app-pane-footer class="workspace-pane-footer">
      <app-workspace-export-bar slot="left" [scopeIds]="scopeIds()" [images]="images()"></app-workspace-export-bar>
    </app-pane-footer>
  `,
  styleUrl: './workspace-pane-footer.component.scss',
})
export class WorkspacePaneFooterComponent {
  readonly scopeIds = input.required<string[]>();
  readonly images = input.required<WorkspaceImage[]>();
}
