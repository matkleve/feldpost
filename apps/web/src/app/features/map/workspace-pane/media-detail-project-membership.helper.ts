import { WritableSignal } from '@angular/core';
import { ProjectsService } from '../../../core/projects/projects.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ToastService } from '../../../core/toast.service';
import { ImageRecord, MediaContextRow, SelectOption } from './media-detail-view.types';

type DetailTranslateFn = (key: string, fallback: string) => string;

interface ProjectMembershipHelperDeps {
  supabase: SupabaseService;
  projectsService: ProjectsService;
  toastService: ToastService;
  t: DetailTranslateFn;
  image: WritableSignal<ImageRecord | null>;
  selectedProjectIds: WritableSignal<Set<string>>;
  primaryProjectId: WritableSignal<string | null>;
  mediaItemId: WritableSignal<string | null>;
  mediaType: WritableSignal<string | null>;
  mediaMimeType: WritableSignal<string | null>;
  mediaLocationStatus: WritableSignal<string | null>;
  projectOptions: WritableSignal<SelectOption[]>;
  projectSearch: WritableSignal<string>;
  canAssignMultipleProjects: () => boolean;
  primarySelectorVisible: () => boolean;
}

export class ImageDetailProjectMembershipHelper {
  constructor(private readonly deps: ProjectMembershipHelperDeps) {}

  async loadProjectMemberships(imageId: string, fallbackProjectId: string | null): Promise<void> {
    const mediaContext = await this.loadMediaContext(imageId);
    const memberships = new Set<string>();
    let resolvedPrimaryProjectId: string | null = mediaContext?.primary_project_id ?? null;

    if (mediaContext?.id) {
      const mediaMemberships = await this.deps.projectsService.loadMediaProjectMemberships(
        mediaContext.id,
      );
      for (const projectId of mediaMemberships) {
        memberships.add(projectId);
      }
      if (mediaContext.primary_project_id) {
        memberships.add(mediaContext.primary_project_id);
      }
    }

    if (memberships.size === 0 && fallbackProjectId) {
      memberships.add(fallbackProjectId);
    }

    if (!resolvedPrimaryProjectId && fallbackProjectId && memberships.has(fallbackProjectId)) {
      resolvedPrimaryProjectId = fallbackProjectId;
    }

    if (!resolvedPrimaryProjectId && memberships.size > 0) {
      resolvedPrimaryProjectId = [...memberships][0] ?? null;
    }

    this.deps.selectedProjectIds.set(memberships);
    this.deps.primaryProjectId.set(resolvedPrimaryProjectId);
  }

  async toggleProjectMembership(projectId: string): Promise<void> {
    const previous = new Set(this.deps.selectedProjectIds());
    const next = new Set(previous);
    const removing = next.has(projectId);

    if (removing && previous.size === 1) {
      this.showProjectRequiredToast();
      return;
    }

    if (!removing && !this.deps.canAssignMultipleProjects() && previous.size > 0) {
      this.showSingleProjectToast();
      return;
    }

    if (removing) {
      next.delete(projectId);
    } else {
      next.add(projectId);
    }

    const currentPrimaryProjectId = this.deps.primaryProjectId();
    if (!currentPrimaryProjectId || !next.has(currentPrimaryProjectId)) {
      this.deps.primaryProjectId.set([...next][0] ?? null);
    }

    this.deps.selectedProjectIds.set(next);
    await this.persistProjectMemberships(previous);
  }

  async setPrimaryProject(projectId: string): Promise<void> {
    if (!this.deps.primarySelectorVisible()) {
      return;
    }

    if (!this.deps.selectedProjectIds().has(projectId)) {
      return;
    }

    if (this.deps.primaryProjectId() === projectId) {
      return;
    }

    const previousPrimary = this.deps.primaryProjectId();
    this.deps.primaryProjectId.set(projectId);

    const mediaItemId = this.deps.mediaItemId();
    if (mediaItemId) {
      const ok = await this.deps.projectsService.setMediaPrimaryProject(mediaItemId, projectId);
      if (!ok) {
        this.deps.primaryProjectId.set(previousPrimary);
        this.showPrimaryProjectFailedToast();
        return;
      }
    } else {
      const img = this.deps.image();
      if (!img) {
        return;
      }

      const mediaContext = await this.loadMediaContext(img.id);
      if (!mediaContext?.id) {
        this.deps.primaryProjectId.set(previousPrimary);
        this.showPrimaryProjectFailedToast();
        return;
      }

      const ok = await this.deps.projectsService.setMediaPrimaryProject(mediaContext.id, projectId);

      if (!ok) {
        this.deps.primaryProjectId.set(previousPrimary);
        this.showPrimaryProjectFailedToast();
        return;
      }
    }

    this.deps.image.update((prev) => (prev ? { ...prev, project_id: projectId } : prev));
  }

  async createProjectFromSearch(): Promise<void> {
    const name = this.deps.projectSearch().trim();
    if (!name) return;

    const img = this.deps.image();
    if (!img?.organization_id) return;

    if (!this.deps.canAssignMultipleProjects() && this.deps.selectedProjectIds().size > 0) {
      this.showSingleProjectToast();
      return;
    }

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
      .select('id,primary_project_id,media_type,mime_type,location_status')
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
    const img = this.deps.image();
    if (!img) return;

    const next = this.deps.selectedProjectIds();
    const prevIds = [...previous];
    const nextIds = [...next];

    const toInsert = nextIds.filter((id) => !previous.has(id));
    const toDelete = prevIds.filter((id) => !next.has(id));
    const requestedPrimaryProjectId = this.deps.primaryProjectId();
    const primaryProjectId =
      requestedPrimaryProjectId && next.has(requestedPrimaryProjectId)
        ? requestedPrimaryProjectId
        : (nextIds[0] ?? null);

    if (nextIds.length === 0) {
      this.deps.selectedProjectIds.set(previous);
      this.showProjectRequiredToast();
      return;
    }

    if (!this.deps.canAssignMultipleProjects() && nextIds.length > 1) {
      this.deps.selectedProjectIds.set(previous);
      this.showSingleProjectToast();
      return;
    }

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

    if (primaryProjectId) {
      const ok = await this.deps.projectsService.setMediaPrimaryProject(
        mediaItemId,
        primaryProjectId,
      );
      if (!ok) {
        this.deps.selectedProjectIds.set(previous);
        this.showPrimaryProjectFailedToast();
        return;
      }
    }

    this.deps.primaryProjectId.set(primaryProjectId);
    this.deps.image.update((prev) => (prev ? { ...prev, project_id: primaryProjectId } : prev));
  }

  private showProjectRequiredToast(): void {
    this.deps.toastService.show({
      message: this.deps.t(
        'workspace.imageDetail.toast.projectRequired',
        'At least one project is required.',
      ),
      type: 'warning',
      dedupe: true,
    });
  }

  private showSingleProjectToast(): void {
    this.deps.toastService.show({
      message: this.deps.t(
        'workspace.imageDetail.toast.noGpsSingleProject',
        'No-GPS media can only belong to one project.',
      ),
      type: 'warning',
      dedupe: true,
    });
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

  private showPrimaryProjectFailedToast(): void {
    this.deps.toastService.show({
      message: this.deps.t(
        'workspace.imageDetail.toast.primaryProjectFailed',
        'Could not set primary project.',
      ),
      type: 'error',
      dedupe: true,
    });
  }
}
