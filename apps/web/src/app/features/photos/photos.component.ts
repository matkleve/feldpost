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
  template: `
    <main class="media-page" data-i18n-skip>
      <section class="media-rail content-clamp content-clamp--list">
        <app-vstack [spacing]="4">
          <!-- Page Header with Breadcrumb -->
          <app-media-page-header
            [title]="t('media.page.title', 'Media')"
            [mediaCount]="mediaItems().length"
            [loading]="loading()"
          />

          <!-- Content Section -->
          <section class="media-content">
            @if (loading()) {
              <div
                class="media-loading"
                role="status"
                [attr.aria-label]="t('common.loading', 'Loading media...')"
              >
                <p>{{ t('common.loading', 'Loading media...') }}</p>
              </div>
            } @else if (loadError()) {
              <div class="media-error" role="alert">
                <p>{{ t('media.page.error', 'Failed to load media') }}</p>
                <button (click)="loadMedia()" class="media-error__retry">
                  {{ t('media.page.retry', 'Retry') }}
                </button>
              </div>
            } @else if (mediaItems().length === 0) {
              <div class="media-empty">
                <p>{{ t('media.page.empty', 'No media found') }}</p>
              </div>
            } @else {
              <ul class="media-grid">
                @for (item of mediaItems(); track item.id) {
                  <li
                    class="media-grid__item"
                    (click)="onMediaItemClicked(item.id)"
                    [class.media-grid__item--selected]="
                      workspaceSelectionService.isSelected(item.id)
                    "
                    tabindex="0"
                    role="option"
                    [attr.aria-selected]="workspaceSelectionService.isSelected(item.id)"
                  >
                    <div class="media-card">
                      <img
                        [src]="item.thumbnail_path || ''"
                        [alt]="item.address_label || 'Media item'"
                      />
                      <div class="media-card__info">
                        <p class="media-card__title">{{ item.address_label }}</p>
                        <p class="media-card__date">{{ formatDate(item.captured_at) }}</p>
                      </div>
                    </div>
                  </li>
                }
              </ul>
            }
          </section>
        </app-vstack>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }

      .media-page {
        min-height: 100%;
        padding: var(--spacing-4);
      }

      .media-rail {
        width: 100%;
        margin-inline: auto;
        display: grid;
        gap: var(--spacing-4);
      }

      .media-loading {
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-panel);
        background: var(--color-bg-surface);
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-2);
        text-align: center;
        color: var(--color-text-muted);
      }

      .media-empty {
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-panel);
        background: var(--color-bg-surface);
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-2);
        text-align: center;
        color: var(--color-text-muted);
      }

      .media-error {
        border: 1px solid color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
        border-radius: var(--container-radius-panel);
        background: color-mix(in srgb, var(--color-bg-surface) 88%, var(--color-warning));
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-2);
        text-align: center;

        p {
          margin: 0;
          color: var(--color-text-secondary);
        }
      }

      .media-error__retry {
        max-width: fit-content;
        margin-inline: auto;
        padding: var(--spacing-2) var(--spacing-3);
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-control);
        background: var(--color-bg-base);
        color: var(--color-text-primary);
        cursor: pointer;
        font-size: 0.875rem;
        transition: background-color 0.2s;

        &:hover {
          background: var(--color-bg-surface);
        }
      }

      .media-content {
        display: grid;
        gap: var(--spacing-3);
      }

      .media-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
        gap: var(--spacing-3);
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .media-grid__item {
        cursor: pointer;
        border-radius: var(--container-radius-control);
        outline: 2px solid transparent;
        outline-offset: 2px;
        transition: outline-color 0.2s;

        &:focus-visible {
          outline-color: var(--color-brand);
        }

        &:hover .media-card {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        &--selected .media-card {
          outline: 2px solid var(--color-brand);
        }
      }

      .media-card {
        position: relative;
        border-radius: var(--container-radius-control);
        overflow: hidden;
        aspect-ratio: 1;
        background: var(--color-bg-secondary);
        transition: box-shadow 0.2s;
      }

      .media-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .media-card__info {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: var(--spacing-2);
        background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
        color: white;
      }

      .media-card__title {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .media-card__date {
        margin: var(--spacing-1) 0 0 0;
        font-size: 0.625rem;
        opacity: 0.8;
      }
    `,
  ],
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
