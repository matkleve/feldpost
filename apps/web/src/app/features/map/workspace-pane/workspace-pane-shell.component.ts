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
  styles: `
    :host {
      display: contents;
    }

    .workspace-pane-shell {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: var(--color-bg-surface);
      box-shadow: var(--elevation-overlay);
    }

    @media (min-width: 48rem) {
      .workspace-pane-shell {
        height: 100%;
        overflow: hidden;
        animation: workspace-pane-shell-clip-in-right 200ms ease-out;
      }
    }

    @media (max-width: 47.9375rem) {
      .workspace-pane-shell {
        width: 100% !important;
        height: 40vh;
        position: fixed;
        bottom: 3.5rem;
        left: 0;
        right: 0;
        z-index: var(--z-panel);
        border-radius: 0;
        animation: workspace-pane-shell-clip-in-up 250ms cubic-bezier(0.4, 0, 0.2, 1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .workspace-pane-shell {
        animation: none;
      }
    }

    @keyframes workspace-pane-shell-clip-in-right {
      from {
        clip-path: inset(0 0 0 100%);
      }

      to {
        clip-path: inset(0 0 0 0);
      }
    }

    @keyframes workspace-pane-shell-clip-in-up {
      from {
        clip-path: inset(100% 0 0 0);
      }

      to {
        clip-path: inset(0 0 0 0);
      }
    }
  `,
})
export class WorkspacePaneShellComponent {
  readonly open = input(false);
  readonly currentWidth = input(360);
  readonly minWidth = input(280);
  readonly maxWidth = input(640);
  readonly defaultWidth = input(360);
  readonly widthChange = output<number>();
}
