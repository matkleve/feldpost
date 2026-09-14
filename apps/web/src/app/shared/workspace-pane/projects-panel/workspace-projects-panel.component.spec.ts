import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { WorkspaceProjectsPanelComponent } from './workspace-projects-panel.component';
import { ProjectsService } from '../../../core/projects/projects.service';
import { MapContextActionsService } from '../../../features/map/map-shell/context-menu/map-context-actions.service';
import { ToastService } from '../../../core/toast/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { ProjectListItem } from '../../../core/projects/projects.types';

function buildProject(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: 'project-1',
    name: 'Project',
    colorKey: 'accent',
    locationRequired: false,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    totalImageCount: 0,
    matchingImageCount: 0,
    lastActivity: null,
    city: null,
    district: null,
    street: null,
    country: null,
    fileTypeCounts: [],
    ...overrides,
  };
}

describe('WorkspaceProjectsPanelComponent', () => {
  async function setup() {
    const projectsServiceMock = {
      loadProjects: vi.fn().mockResolvedValue([]),
      createProject: vi.fn(),
      renameProject: vi.fn(),
      setProjectColor: vi.fn(),
      archiveProject: vi.fn(),
      restoreProject: vi.fn(),
      deleteProject: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [WorkspaceProjectsPanelComponent],
      providers: [
        { provide: ProjectsService, useValue: projectsServiceMock },
        {
          provide: MapContextActionsService,
          useValue: { assignImagesToProject: vi.fn().mockResolvedValue({ ok: true }) },
        },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: I18nService, useValue: { t: (_key: string, fallback = '') => fallback } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(WorkspaceProjectsPanelComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    return { fixture, component: fixture.componentInstance, projectsServiceMock };
  }

  it('requires confirmation before deleting an archived project', async () => {
    const { component, projectsServiceMock } = await setup();
    component.projects.set([
      buildProject({
        id: 'project-1',
        name: 'Archived Project',
        status: 'archived',
        archivedAt: '2026-01-01T00:00:00.000Z',
        totalImageCount: 4,
      }),
    ]);
    component.openProjectId.set('project-1');
    component.panelState.set('detail');

    await component.onDangerAction('project-1', 'delete');
    expect(projectsServiceMock.deleteProject).not.toHaveBeenCalled();
    expect(component.pendingDeleteProjectId()).toBe('project-1');

    await component.confirmPendingDelete();
    expect(projectsServiceMock.deleteProject).toHaveBeenCalledWith('project-1');
    expect(component.projects()).toEqual([]);
    expect(component.pendingDeleteProjectId()).toBeNull();
  });

  it('does not allow delete action for active projects', async () => {
    const { component, projectsServiceMock } = await setup();
    component.projects.set([
      buildProject({
        id: 'project-1',
        name: 'Active Project',
        status: 'active',
        archivedAt: null,
        totalImageCount: 4,
      }),
    ]);

    await component.onDangerAction('project-1', 'delete');
    expect(component.pendingDeleteProjectId()).toBeNull();
    expect(projectsServiceMock.deleteProject).not.toHaveBeenCalled();
  });
});
