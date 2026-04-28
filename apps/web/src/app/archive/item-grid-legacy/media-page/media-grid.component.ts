import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { inject } from '@angular/core';
import { signal } from '@angular/core';
import type { ImageRecord } from '../../../core/media-query/media-query.types';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { CardGridComponent } from '../../shared/ui-primitives/card-grid.component';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import { MediaCardComponent } from './media-card.component';

@Component({
  selector: 'app-media-grid',
  standalone: true,
  imports: [CardGridComponent, MediaCardComponent],
  templateUrl: './media-grid.component.html',
  styleUrl: './media-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaGridComponent {
  protected readonly workspaceSelectionService = inject(WorkspaceSelectionService);

  readonly items = input.required<ImageRecord[]>();
  readonly variant = input<CardVariant>('medium');
  readonly projectNameFor = input.required<(projectId: string | null) => string>();
  readonly itemClicked = output<string>();
  readonly activeDescendantId = signal<string | null>(null);

  onItemClicked(mediaId: string): void {
    this.itemClicked.emit(mediaId);
  }

  onItemKeydown(event: KeyboardEvent, mediaId: string): void {
    const currentOption = event.currentTarget as HTMLElement | null;
    if (!currentOption) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onItemClicked(mediaId);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusSiblingOption(currentOption, 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusSiblingOption(currentOption, -1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.focusOptionByIndex(currentOption, 0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.focusOptionByIndex(currentOption, -1);
    }
  }

  onItemFocused(mediaId: string): void {
    this.activeDescendantId.set(`media-option-${mediaId}`);
  }

  private focusSiblingOption(currentOption: HTMLElement, offset: 1 | -1): void {
    const options = this.getOptionElements(currentOption);
    const currentIndex = options.findIndex((option) => option === currentOption);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = (currentIndex + offset + options.length) % options.length;
    this.focusOptionByResolvedIndex(options, nextIndex);
  }

  private focusOptionByIndex(currentOption: HTMLElement, index: number): void {
    const options = this.getOptionElements(currentOption);
    if (options.length === 0) {
      return;
    }

    const resolvedIndex = index < 0 ? options.length - 1 : index;
    this.focusOptionByResolvedIndex(options, resolvedIndex);
  }

  private focusOptionByResolvedIndex(options: HTMLElement[], index: number): void {
    const option = options[index];
    if (!option) {
      return;
    }

    option.focus();
    const mediaId = option.getAttribute('data-media-id');
    if (mediaId) {
      this.onItemFocused(mediaId);
    }
  }

  private getOptionElements(currentOption: HTMLElement): HTMLElement[] {
    const listbox = currentOption.closest('[role="listbox"]');
    if (!listbox) {
      return [];
    }

    return Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
  }
}
