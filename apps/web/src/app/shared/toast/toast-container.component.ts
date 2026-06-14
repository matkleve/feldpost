import { Component, inject, signal } from '@angular/core';
import { ToastService } from '../../core/toast/toast.service';
import { ToastItemComponent } from './toast-item.component';

@Component({
  selector: 'ss-toast-container',
  standalone: true,
  imports: [ToastItemComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
  host: {
    role: 'region',
    'aria-label': 'Notifications',
    'aria-live': 'polite',
    '[class.expanded]': 'stackExpanded()',
  },
})
export class ToastContainerComponent {
  readonly toast = inject(ToastService);
  readonly stackExpanded = signal(false);

  onStackEnter(): void {
    this.stackExpanded.set(true);
    this.toast.pauseAll();
  }

  onStackLeave(): void {
    this.stackExpanded.set(false);
    this.toast.resumeAll();
  }
}
