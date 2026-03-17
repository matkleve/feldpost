import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectSelectOption } from '../../../shared/project-select-dialog/project-select-dialog.component';
import { MapContextActionsService } from './map-context-actions.service';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface CreateProjectFromImageResult {
  ok: boolean;
  reason: 'success' | 'organization-missing' | 'create-failed';
  project?: { id: string; name: string };
  errorMessage?: string;
}

export interface LoadProjectOptionsResult {
  ok: boolean;
  reason: 'success' | 'empty' | 'error';
  options: ReadonlyArray<ProjectSelectOption>;
}

export interface ProjectAssignmentResultLike {
  ok: boolean;
  reason: 'success' | 'empty' | 'error';
  errorMessage?: string;
}

export interface ProjectActionToast {
  message: string;
  type: 'success' | 'warning' | 'error';
}

export interface ProjectActionResult {
  ok: boolean;
  toast: ProjectActionToast;
}

@Injectable({ providedIn: 'root' })
export class MapProjectActionsService {
  constructor(
    private readonly mapContextActionsService: MapContextActionsService,
    private readonly i18nService: I18nService,
  ) {}

  private t(key: string, fallback = ''): string {
    return this.i18nService.t(key, fallback);
  }

  getNoRadiusSelectionWarningToast(): ProjectActionToast {
    return {
      message: this.t(
        'map.shell.toast.noMediaInRadiusSelection',
        'Keine Medien in Radius-Auswahl verfuegbar.',
      ),
      type: 'warning',
    };
  }

  getAssignmentFailureMessage(result: ProjectAssignmentResultLike): string | null {
    if (result.ok) {
      return null;
    }

    if (result.reason === 'empty') {
      return this.t(
        'map.shell.toast.noMediaForProjectAssignment',
        'Keine Medien fuer Projektzuweisung gefunden.',
      );
    }

    return (
      result.errorMessage ??
      this.t('map.shell.toast.projectAssignmentFailed', 'Projektzuweisung fehlgeschlagen.')
    );
  }

  formatProjectAssignmentSuccess(projectName: string, imageCount: number): string {
    return imageCount === 1
      ? this.t(
          'map.shell.toast.projectAssigned.single',
          'Zum Projekt "{project}" zugewiesen.',
        ).replace('{project}', projectName)
      : this.t(
          'map.shell.toast.projectAssigned.multi',
          '{count} Medien dem Projekt "{project}" zugewiesen.',
        )
          .replace('{count}', String(imageCount))
          .replace('{project}', projectName);
  }

  async assignSelectionToProject(params: {
    client: SupabaseClient;
    imageIds: string[];
    projectId: string;
    projectName: string;
  }): Promise<ProjectActionResult> {
    const assigned = await this.mapContextActionsService.assignImagesToProject(
      params.client,
      params.imageIds,
      params.projectId,
    );
    const assignFailureMessage = this.getAssignmentFailureMessage(assigned);

    if (assignFailureMessage) {
      return {
        ok: false,
        toast: {
          message: assignFailureMessage,
          type: assigned.reason === 'empty' ? 'warning' : 'error',
        },
      };
    }

    return {
      ok: true,
      toast: {
        message: this.formatProjectAssignmentSuccess(params.projectName, params.imageIds.length),
        type: 'success',
      },
    };
  }

  async createProjectFromSelection(params: {
    client: SupabaseClient;
    projectName: string;
    imageIds: string[];
  }): Promise<ProjectActionResult> {
    if (params.imageIds.length === 0) {
      return {
        ok: false,
        toast: this.getNoRadiusSelectionWarningToast(),
      };
    }

    const created = await this.createProjectFromFirstImage({
      client: params.client,
      projectName: params.projectName,
      firstImageId: params.imageIds[0],
    });

    if (!created.ok || !created.project) {
      if (created.reason === 'organization-missing') {
        return {
          ok: false,
          toast: {
            message: this.t(
              'map.shell.toast.projectCreateOrganizationUnknown',
              'Projekt konnte nicht erstellt werden (Organisation unbekannt).',
            ),
            type: 'error',
          },
        };
      }

      return {
        ok: false,
        toast: {
          message:
            created.errorMessage ??
            this.t('map.shell.toast.projectCreateFailed', 'Projekt konnte nicht erstellt werden.'),
          type: 'error',
        },
      };
    }

    const assigned = await this.mapContextActionsService.assignImagesToProject(
      params.client,
      params.imageIds,
      created.project.id,
    );
    const assignFailureMessage = this.getAssignmentFailureMessage(assigned);
    if (assignFailureMessage) {
      return {
        ok: false,
        toast: {
          message: assignFailureMessage,
          type: assigned.reason === 'empty' ? 'warning' : 'error',
        },
      };
    }

    return {
      ok: true,
      toast: {
        message: this.t(
          'map.shell.toast.projectCreatedAndAssigned',
          'Projekt "{project}" erstellt und {count} Medien zugewiesen.',
        )
          .replace('{project}', created.project.name)
          .replace('{count}', String(params.imageIds.length)),
        type: 'success',
      },
    };
  }

  async loadProjectOptions(client: SupabaseClient): Promise<LoadProjectOptionsResult> {
    const { data, error } = await client.from('projects').select('id,name').order('name', {
      ascending: true,
    });

    if (error) {
      return { ok: false, reason: 'error', options: [] };
    }

    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, reason: 'empty', options: [] };
    }

    const options = data.map((project) => ({
      id: project.id as string,
      name: (project.name as string) ?? this.t('map.shell.value.projectFallback', 'Projekt'),
    }));

    return {
      ok: true,
      reason: 'success',
      options,
    };
  }

  getActiveSelectionImageIds(images: ReadonlyArray<{ id: string }>): string[] {
    const unique = new Set(images.map((img) => img.id));
    return Array.from(unique);
  }

  async createProjectFromFirstImage(params: {
    client: SupabaseClient;
    projectName: string;
    firstImageId: string;
  }): Promise<CreateProjectFromImageResult> {
    const organizationId = await this.resolveOrganizationIdForImage(
      params.client,
      params.firstImageId,
    );
    if (!organizationId) {
      return { ok: false, reason: 'organization-missing' };
    }

    const { data: projectData, error: projectError } = await params.client
      .from('projects')
      .insert({ name: params.projectName, organization_id: organizationId })
      .select('id,name')
      .single();

    if (projectError || !projectData) {
      return {
        ok: false,
        reason: 'create-failed',
        errorMessage: projectError?.message,
      };
    }

    return {
      ok: true,
      reason: 'success',
      project: {
        id: String(projectData.id),
        name: String(projectData.name ?? params.projectName),
      },
    };
  }

  private async resolveOrganizationIdForImage(
    client: SupabaseClient,
    imageId: string,
  ): Promise<string | null> {
    const { data, error } = await client
      .from('images')
      .select('organization_id')
      .eq('id', imageId)
      .single();

    if (error || !data?.organization_id) {
      return null;
    }

    return data.organization_id as string;
  }
}
