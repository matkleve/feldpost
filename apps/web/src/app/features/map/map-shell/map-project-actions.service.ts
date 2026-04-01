import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectSelectOption } from '../../../shared/project-select-dialog/project-select-dialog.component';

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

@Injectable({ providedIn: 'root' })
export class MapProjectActionsService {
  getAssignmentFailureMessage(result: ProjectAssignmentResultLike): string | null {
    if (result.ok) {
      return null;
    }

    if (result.reason === 'empty') {
      return 'Keine Medien fuer Projektzuweisung gefunden.';
    }

    return result.errorMessage ?? 'Projektzuweisung fehlgeschlagen.';
  }

  formatProjectAssignmentSuccess(projectName: string, imageCount: number): string {
    return imageCount === 1
      ? `Zum Projekt "${projectName}" zugewiesen.`
      : `${imageCount} Medien dem Projekt "${projectName}" zugewiesen.`;
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
      name: (project.name as string) ?? 'Projekt',
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
    mediaId: string,
  ): Promise<string | null> {
    const { data, error } = await client
      .from('media_items')
      .select('organization_id')
      .or(`id.eq.${mediaId},source_image_id.eq.${mediaId}`)
      .limit(1)
      .maybeSingle();

    if (error || !data?.organization_id) {
      return null;
    }

    return data.organization_id as string;
  }
}
