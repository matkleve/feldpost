import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pane-header',
  template: `
    <div class="pane-header">
      <span class="pane-header__title">{{ title() }}</span>
      <button
        class="pane-header__close-btn"
        type="button"
        aria-label="Close workspace pane"
        title="Close workspace pane"
        (click)="close.emit()"
      >
        <span class="material-icons" aria-hidden="true">close</span>
      </button>
    </div>
  `,
  styleUrl: './pane-header.component.scss',
})
export class PaneHeaderComponent {
  readonly title = input('Workspace');
  readonly close = output<void>();
}
