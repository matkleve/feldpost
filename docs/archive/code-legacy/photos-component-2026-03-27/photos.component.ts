/**
 * MediaPageComponent — /media page shell.
 * Displays media (images, videos, documents) with grid layout.
 * Workspace pane is mounted globally by AppShell, not here.
 *
 * Layout mirrors projects-page pattern:
 * main > section.content-clamp > header + content
 */
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { VStackComponent } from '../../shared/containers';
import { MediaPageHeaderComponent } from './media-page-header.component';
import type { SelectedItemsContextPort } from '../../core/workspace-pane-context.port';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import type { ImageRecord } from '../../features/map/workspace-pane/image-detail-view.types';

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [VStackComponent, MediaPageHeaderComponent],
  templateUrl: './photos.component.html',
  styleUrl: './photos.component.scss',
})
export class PhotosComponent implements OnDestroy {
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  protected readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly supabaseService = inject(SupabaseService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly mediaItems = signal<ImageRecord[]>([]);

  readonly t = (key: string, fallback: string): string => fallback; // TODO: i18n

  constructor() {
    // Load media from database
    effect(
      () => {
        void this.loadMedia();
      },
      { allowSignalWrites: true },
    );

    // Bind media context to workspace pane
    const mediaSelectedItemsContext: SelectedItemsContextPort = {
      contextKey: 'media',
      selectedMediaIds$: this.workspaceSelectionService.selectedMediaIds,
      requestOpenDetail: (mediaId: string) => {
        // Detail view is managed by workspace pane directly
        // Media page just provides selection; pane handles detail overlay
      },
      requestSetHover: () => {
        // Hover state not used in media page (only needed for map linked-hover)
      },
    };

    this.workspacePaneObserver.onContextRebind(mediaSelectedItemsContext);
  }

  ngOnDestroy(): void {
    this.workspacePaneObserver.onRouteLeave('media');
  }

  onMediaItemClicked(mediaId: string): void {
    // Single-select: set as single selected item + open detail view
    this.workspaceSelectionService.setSingle(mediaId);
    // Open detail view in workspace pane
    this.workspacePaneObserver.setDetailImageId(mediaId);
  }

  async loadMedia(): Promise<void> {
    this.loading.set(true);
    try {
      // Get current user from Supabase auth
      const {
        data: { user },
      } = await this.supabaseService.client.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await this.supabaseService.client
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.mediaItems.set((data as ImageRecord[]) || []);
    } catch (err) {
      console.error('Failed to load media:', err);
      this.loadError.set('Failed to load media');
      this.mediaItems.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '';
    }
  }
}
