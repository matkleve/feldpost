import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkspaceImage } from '../../../core/workspace-view.types';
import { MapContextActionsService } from './map-context-actions.service';
import { MapProjectActionsService, ProjectActionToast } from './map-project-actions.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MapProjectDialogService, ProjectDialogSignals } from './map-project-dialog.service';

interface MarkerContextPayloadLike {
  count: number;
  imageId?: string;
  sourceCells: Array<{ lat: number; lng: number }>;
}

@Injectable({ providedIn: 'root' })
export class MapProjectContextOrchestratorService {
  constructor(
    private readonly mapProjectActionsService: MapProjectActionsService,
    private readonly mapContextActionsService: MapContextActionsService,
    private readonly mapProjectDialogService: MapProjectDialogService,
    private readonly i18nService: I18nService,
  ) {}

  private t(key: string, fallback = ''): string {
    return this.i18nService.t(key, fallback);
  }

  async handleRadiusCreateProjectFromSelection(params: {
    rawImages: ReadonlyArray<{ id: string }>;
    client: SupabaseClient;
    signals: ProjectDialogSignals;
  }): Promise<ProjectActionToast | null> {
    const imageIds = this.mapProjectActionsService.getActiveSelectionImageIds(params.rawImages);
    if (imageIds.length === 0) {
      return this.mapProjectActionsService.getNoRadiusSelectionWarningToast();
    }

    const projectName = await this.promptProjectNameFromRadius(params.signals);
    if (!projectName) {
      return null;
    }

    const result = await this.mapProjectActionsService.createProjectFromSelection({
      client: params.client,
      projectName,
      imageIds,
    });
    return result.toast;
  }

  async handleRadiusAssignToProject(params: {
    rawImages: ReadonlyArray<{ id: string }>;
    client: SupabaseClient;
    signals: ProjectDialogSignals;
  }): Promise<ProjectActionToast | null> {
    const imageIds = this.mapProjectActionsService.getActiveSelectionImageIds(params.rawImages);
    if (imageIds.length === 0) {
      return this.mapProjectActionsService.getNoRadiusSelectionWarningToast();
    }

    const projectSelection = await this.promptProjectSelection(params.signals, params.client);
    if (projectSelection.toast) {
      return projectSelection.toast;
    }
    const project = projectSelection.project;
    if (!project) {
      return null;
    }

    const result = await this.mapProjectActionsService.assignSelectionToProject({
      client: params.client,
      imageIds,
      projectId: project.id,
      projectName: project.name,
    });
    return result.toast;
  }

  async handleMarkerAssignToProject(params: {
    payload: MarkerContextPayloadLike;
    zoom: number;
    client: SupabaseClient;
    signals: ProjectDialogSignals;
    fetchClusterImages: (
      cells: Array<{ lat: number; lng: number }>,
      zoom: number,
    ) => Promise<WorkspaceImage[]>;
  }): Promise<ProjectActionToast | null> {
    const projectSelection = await this.promptProjectSelection(params.signals, params.client);
    if (projectSelection.toast) {
      return projectSelection.toast;
    }
    const project = projectSelection.project;
    if (!project) {
      return null;
    }

    const imageIds = await this.mapContextActionsService.resolveMarkerContextImageIds(
      params.payload,
      params.fetchClusterImages,
      params.zoom,
    );
    if (imageIds.length === 0) {
      return {
        message: this.mapProjectActionsService.getAssignmentFailureMessage({
          ok: false,
          reason: 'empty',
        })!,
        type: 'warning',
      };
    }

    const result = await this.mapProjectActionsService.assignSelectionToProject({
      client: params.client,
      imageIds,
      projectId: project.id,
      projectName: project.name,
    });
    return result.toast;
  }

  private async promptProjectSelection(
    signals: ProjectDialogSignals,
    client: SupabaseClient,
  ): Promise<{ project: { id: string; name: string } | null; toast?: ProjectActionToast }> {
    const projects = await this.mapProjectActionsService.loadProjectOptions(client);

    if (!projects.ok) {
      return {
        project: null,
        toast: {
          message: this.t('map.shell.toast.noProjectsAvailable', 'Keine Projekte verfuegbar.'),
          type: 'warning',
        },
      };
    }

    const project = await this.mapProjectDialogService.openProjectSelectionDialog(
      signals,
      projects.options,
      this.t('map.shell.dialog.projectSelect.title', 'Projekt auswaehlen'),
      this.t(
        'map.shell.dialog.projectSelect.message',
        'Waehle ein bestehendes Projekt fuer die Zuweisung aus.',
      ),
    );
    return { project };
  }

  private async promptProjectNameFromRadius(signals: ProjectDialogSignals): Promise<string | null> {
    return this.mapProjectDialogService.openProjectNameDialog(
      signals,
      this.t('map.shell.dialog.projectName.title', 'Name fuer neues Projekt aus Radius'),
      this.t('map.shell.dialog.projectName.initialValue', 'Neues Radius Projekt'),
      this.t('map.shell.dialog.projectName.message', 'Gib einen Projektnamen ein.'),
    );
  }
}
