import { WritableSignal } from '@angular/core';
import { ProjectsService } from '../../../core/projects/projects.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ImageRecord, MediaContextRow, SelectOption } from './media-detail-view.types';

type DetailTranslateFn = (key: string, fallback: string) => string;

interface ProjectMembershipHelperDeps {
  supabase: SupabaseService;
  projectsService: ProjectsService;
  toastService: ToastService;
  t: DetailTranslateFn;
  media: WritableSignal<ImageRecord | null>;
  selectedProjectIds: WritableSignal<Set<string>>;
  mediaItemId: WritableSignal<string | null>;
  mediaType: WritableSignal<string | null>;
  mediaMimeType: WritableSignal<string | null>;
  mediaLocationStatus: WritableSignal<string | null>;
  projectOptions: WritableSignal<SelectOption[]>;
  projectSearch: WritableSignal<string>;
  canAssignMultipleProjects: () => boolean;
}

export class ImageDetailProjectMembershipHelper {
  constructor(private readonly deps: ProjectMembershipHelperDeps) {}

  async loadProjectMemberships(imageId: string, fallbackProjectId: string | null): Promise<void> {
    const mediaContext = await this.loadMediaContext(imageId);
    const memberships = new Set<string>();

    if (mediaContext?.id) {
      const mediaMemberships = await this.deps.projectsService.loadMediaProjectMemberships(
        mediaContext.id,
      );
      for (const projectId of mediaMemberships) {
        memberships.add(projectId);
      }
    }

    if (memberships.size === 0 && fallbackProjectId) {
      memberships.add(fallbackProjectId);
    }

    this.deps.selectedProjectIds.set(memberships);
  }

  async toggleProjectMembership(projectId: string): Promise<void> {
    const previous = new Set(this.deps.selectedProjectIds());
    const next = new Set(previous);
    const removing = next.has(projectId);

    if (removing) {
      next.delete(projectId);
    } else {
      next.add(projectId);
    }

    this.deps.selectedProjectIds.set(next);
    await this.persistProjectMemberships(previous);
  }

  async createProjectFromSearch(): Promise<void> {
    const name = this.deps.projectSearch().trim();
    if (!name) return;

    const img = this.deps.media();
    if (!img?.organization_id) return;

    const existing = this.deps
      .projectOptions()
      .find((option) => option.label.toLowerCase() === name.toLowerCase());
    if (existing) {
      await this.toggleProjectMembership(existing.id);
      this.deps.projectSearch.set('');
      return;
    }

    const { data, error } = await this.deps.supabase.client
      .from('projects')
      .insert({ name, organization_id: img.organization_id })
      .select('id,name')
      .single();

    if (error || !data) return;

    const created = { id: data.id as string, label: data.name as string };
    this.deps.projectOptions.update((list) =>
      [...list, created].sort((a, b) => a.label.localeCompare(b.label)),
    );
    this.deps.projectSearch.set('');
    await this.toggleProjectMembership(created.id);
  }

  setProjectSearch(value: string): void {
    this.deps.projectSearch.set(value);
  }

  private async loadMediaContext(imageId: string): Promise<MediaContextRow | null> {
    const response = await this.deps.supabase.client
      .from('media_items')
      .select('id,media_type,mime_type,location_status')
      .or(`id.eq.${imageId},source_image_id.eq.${imageId}`)
      .limit(1)
      .maybeSingle();

    if (response.error || !response.data) {
      this.deps.mediaItemId.set(null);
      this.deps.mediaType.set(null);
      this.deps.mediaMimeType.set(null);
      this.deps.mediaLocationStatus.set(null);
      return null;
    }

    const row = response.data as MediaContextRow;
    this.deps.mediaItemId.set(row.id);
    this.deps.mediaType.set(row.media_type ?? null);
    this.deps.mediaMimeType.set(row.mime_type ?? null);
    this.deps.mediaLocationStatus.set(row.location_status ?? null);
    return row;
  }

  private async persistProjectMemberships(previous: Set<string>): Promise<void> {
    const img = this.deps.media();
    if (!img) return;

    const next = this.deps.selectedProjectIds();
    const prevIds = [...previous];
    const nextIds = [...next];

    const toInsert = nextIds.filter((id) => !previous.has(id));
    const toDelete = prevIds.filter((id) => !next.has(id));
    let mediaItemId = this.deps.mediaItemId();
    if (!mediaItemId) {
      const mediaContext = await this.loadMediaContext(img.id);
      mediaItemId = mediaContext?.id ?? null;
    }

    if (!mediaItemId) {
      this.deps.selectedProjectIds.set(previous);
      this.showMembershipUpdateFailedToast();
      return;
    }

    for (const projectId of toInsert) {
      const ok = await this.deps.projectsService.addMediaToProject(mediaItemId, projectId);
      if (!ok) {
        this.deps.selectedProjectIds.set(previous);
        this.showMembershipUpdateFailedToast();
        return;
      }
    }

    for (const projectId of toDelete) {
      const ok = await this.deps.projectsService.removeMediaFromProject(mediaItemId, projectId);
      if (!ok) {
        this.deps.selectedProjectIds.set(previous);
        this.showMembershipUpdateFailedToast();
        return;
      }
    }

    this.deps.media.update((prev) => (prev ? { ...prev, project_id: nextIds[0] ?? null } : prev));
  }

  private showMembershipUpdateFailedToast(): void {
    this.deps.toastService.show({
      message: this.deps.t(
        'workspace.imageDetail.toast.membershipUpdateFailed',
        'Could not update project memberships.',
      ),
      type: 'error',
      dedupe: true,
    });
  }

  // No "primary project" concept.
}
