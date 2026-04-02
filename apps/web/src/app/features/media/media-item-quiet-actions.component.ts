import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-media-item-quiet-actions',
  imports: [],
  templateUrl: './media-item-quiet-actions.component.html',
  styleUrl: './media-item-quiet-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemQuietActionsComponent {
  readonly selected = input(false);
  readonly disabled = input(false);
  readonly selectLabel = input('');
  readonly contextLabel = input('');

  readonly selectRequested = output<void>();
  readonly contextRequested = output<void>();

  onSelectClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    this.selectRequested.emit();
  }

  onContextClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    this.contextRequested.emit();
  }
}
