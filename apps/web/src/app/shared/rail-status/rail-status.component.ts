import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Centered empty/loading copy inside page-rail body regions. */
@Component({
  selector: 'app-rail-status',
  standalone: true,
  template: `<p class="rail-status" role="status">{{ message() }}</p>`,
  styleUrl: './rail-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RailStatusComponent {
  readonly message = input.required<string>();
}
