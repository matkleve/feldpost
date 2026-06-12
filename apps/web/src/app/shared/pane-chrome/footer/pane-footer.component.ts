import { Component } from '@angular/core';

@Component({
  selector: 'app-pane-footer',
  standalone: true,
  template: `
    <div class="pane-footer">
      <ng-content select="[slot=left]"></ng-content>
      <div class="pane-footer__spacer"></div>
      <ng-content select="[slot=right]"></ng-content>
    </div>
  `,
  styleUrl: './pane-footer.component.scss',
})
export class PaneFooterComponent {}
