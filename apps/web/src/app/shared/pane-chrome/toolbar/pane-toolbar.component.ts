import { Component } from '@angular/core';

@Component({
  selector: 'app-pane-toolbar',
  standalone: true,
  template: `
    <div class="pane-toolbar">
      <div class="pane-toolbar__left">
        <ng-content select="[slot=left]"></ng-content>
      </div>
      <div class="pane-toolbar__center">
        <ng-content select="[slot=center]"></ng-content>
      </div>
      <div class="pane-toolbar__right">
        <ng-content select="[slot=right]"></ng-content>
      </div>
    </div>
  `,
  styleUrl: './pane-toolbar.component.scss',
})
export class PaneToolbarComponent {}
