import { Component, input, output } from '@angular/core';
import { DragDividerComponent } from './drag-divider/drag-divider.component';

@Component({
  selector: 'app-workspace-pane-shell',
  standalone: true,
  imports: [DragDividerComponent],
  template: `
    @if (open()) {
      <app-drag-divider
        [currentWidth]="currentWidth()"
        [minWidth]="minWidth()"
        [maxWidth]="maxWidth()"
        [defaultWidth]="defaultWidth()"
        (widthChange)="widthChange.emit($event)"
      />

      <section class="workspace-pane-shell" [style.width.px]="currentWidth()">
        <ng-content />
      </section>
    }
  `,
  styleUrl: './workspace-pane-shell.component.scss',
})
export class WorkspacePaneShellComponent {
  readonly open = input(false);
  readonly currentWidth = input(360);
  readonly minWidth = input(280);
  readonly maxWidth = input(640);
  readonly defaultWidth = input(360);
  readonly widthChange = output<number>();
}
