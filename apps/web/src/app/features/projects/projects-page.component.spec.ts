import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { ProjectsPageComponent } from './projects-page.component';
import { ProjectsService } from '../../core/projects/projects.service';
import { WorkspaceViewService } from '../../core/workspace-view.service';
import { ToastService } from '../../core/toast.service';

const projectsServiceMock = {
  loadProjects: vi.fn(),
  loadGroupedSearchCounts: vi.fn(),
  createDraftProject: vi.fn(),
  renameProject: vi.fn(),
  archiveProject: vi.fn(),
  deleteProject: vi.fn(),
  setProjectColor: vi.fn(),
  loadProjectWorkspaceImages: vi.fn(),
};

const workspaceViewServiceMock = {
  selectedProjectIds: signal<Set<string>>(new Set()),
  setActiveSelectionImages: vi.fn(),
  clearActiveSelection: vi.fn(),
};

const toastServiceMock = {
  show: vi.fn(),
};

const routerNavigate = vi.fn().mockResolvedValue(true);
const routeParamGet = vi.fn().mockReturnValue(null);

describe('ProjectsPageComponent', () => {
  let fixture: ComponentFixture<ProjectsPageComponent>;
  let component: ProjectsPageComponent;

  beforeEach(async () => {
    vi.useFakeTimers();
    projectsServiceMock.loadProjects.mockResolvedValue([]);
    projectsServiceMock.loadGroupedSearchCounts.mockResolvedValue({});
    projectsServiceMock.loadProjectWorkspaceImages.mockResolvedValue([]);
    routerNavigate.mockClear();
    routeParamGet.mockReturnValue(null);
    workspaceViewServiceMock.setActiveSelectionImages.mockClear();
    workspaceViewServiceMock.clearActiveSelection.mockClear();
    workspaceViewServiceMock.selectedProjectIds.set(new Set());
    toastServiceMock.show.mockClear();

    await TestBed.configureTestingModule({
      imports: [ProjectsPageComponent],
      providers: [
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: WorkspaceViewService, useValue: workspaceViewServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: routeParamGet,
              },
            },
          },
        },
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('defaults to list view mode', () => {
    expect(component.viewMode()).toBe('list');
  });

  it('updates status filter', () => {
    component.onStatusFilterChange('archived');
    expect(component.statusFilter()).toBe('archived');
  });

  it('preserves search, filter, and view mode when closing workspace pane', () => {
    component.searchTerm.set('fang 5');
    component.statusFilter.set('active');
    component.viewMode.set('cards');
    component.selectedProjectId.set('project-1');
    component.workspacePaneOpen.set(true);

    component.closeWorkspacePane();

    expect(component.searchTerm()).toBe('fang 5');
    expect(component.statusFilter()).toBe('active');
    expect(component.viewMode()).toBe('cards');
    expect(component.workspacePaneOpen()).toBe(false);
    expect(component.selectedProjectId()).toBeNull();
  });

  it('restores prior project browsing context on reopen', async () => {
    const host = { nativeElement: { scrollTop: 48 } };
    (component as unknown as { workspacePaneHost: () => typeof host }).workspacePaneHost = () =>
      host;

    component.selectedProjectId.set('project-1');
    component.workspacePaneOpen.set(true);
    component.detailImageId.set('image-7');
    component.closeWorkspacePane();

    host.nativeElement.scrollTop = 0;
    component.detailImageId.set(null);

    await component.openWorkspace('project-1');
    vi.advanceTimersByTime(1);

    expect(component.detailImageId()).toBe('image-7');
    expect(host.nativeElement.scrollTop).toBe(48);
  });

  it('navigates to map with focus payload from image detail action', () => {
    component.onZoomToLocation({ imageId: 'img-1', lat: 48.2, lng: 16.37 });

    expect(routerNavigate).toHaveBeenCalledWith(['/map'], {
      state: {
        mapFocus: {
          imageId: 'img-1',
          lat: 48.2,
          lng: 16.37,
        },
      },
    });
  });

  it('closes open overlays on outside interaction', () => {
    component.activeToolbarDropdown.set('filter');
    component.coloringProjectId.set('project-1');

    component.onOutsideInteraction();

    expect(component.activeToolbarDropdown()).toBeNull();
    expect(component.coloringProjectId()).toBeNull();
  });

  it('closes toolbar dropdown when opening color picker', () => {
    component.activeToolbarDropdown.set('grouping');

    component.toggleColorPicker('project-9');

    expect(component.activeToolbarDropdown()).toBeNull();
    expect(component.coloringProjectId()).toBe('project-9');
  });

  it('archives project via modal confirm flow', async () => {
    projectsServiceMock.archiveProject.mockResolvedValue(true);
    component.projects.set([
      {
        id: 'project-1',
        name: 'Project 1',
        colorKey: 'clay',
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        totalImageCount: 0,
        matchingImageCount: 0,
        lastActivity: null,
        city: null,
        district: null,
        street: null,
        country: null,
      },
    ]);

    component.requestDangerAction('project-1');
    await component.confirmPendingAction();

    expect(projectsServiceMock.archiveProject).toHaveBeenCalledWith('project-1');
    expect(component.projects()[0]?.status).toBe('archived');
    expect(component.hasPendingAction()).toBe(false);
    expect(toastServiceMock.show).toHaveBeenCalledWith({
      message: 'Project archived',
      type: 'success',
    });
  });

  it('deletes archived project via modal confirm flow', async () => {
    projectsServiceMock.deleteProject.mockResolvedValue(true);
    component.projects.set([
      {
        id: 'project-archived',
        name: 'Archived Project',
        colorKey: 'clay',
        archivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'archived',
        totalImageCount: 0,
        matchingImageCount: 0,
        lastActivity: null,
        city: null,
        district: null,
        street: null,
        country: null,
      },
    ]);

    component.requestDangerAction('project-archived');
    await component.confirmPendingAction();

    expect(projectsServiceMock.deleteProject).toHaveBeenCalledWith('project-archived');
    expect(component.projects()).toHaveLength(0);
    expect(component.hasPendingAction()).toBe(false);
    expect(toastServiceMock.show).toHaveBeenCalledWith({
      message: 'Archived project deleted',
      type: 'success',
    });
  });

  it('opens delete action for archived project', () => {
    component.projects.set([
      {
        id: 'project-archived',
        name: 'Archived Project',
        colorKey: 'clay',
        archivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'archived',
        totalImageCount: 0,
        matchingImageCount: 0,
        lastActivity: null,
        city: null,
        district: null,
        street: null,
        country: null,
      },
    ]);

    component.requestDangerAction('project-archived');

    expect(component.isDeletePending()).toBe(true);
  });

  it('creates a draft project, opens workspace, and starts rename mode', async () => {
    projectsServiceMock.loadGroupedSearchCounts.mockClear();
    projectsServiceMock.createDraftProject.mockResolvedValue({
      id: 'project-new',
      name: 'Untitled project',
      colorKey: 'clay',
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      totalImageCount: 0,
      matchingImageCount: 0,
      lastActivity: null,
      city: null,
      district: null,
      street: null,
      country: null,
    });
    const openWorkspaceSpy = vi.spyOn(component, 'openWorkspace').mockResolvedValue();

    await component.onNewProject();

    expect(projectsServiceMock.createDraftProject).toHaveBeenCalledOnce();
    expect(openWorkspaceSpy).toHaveBeenCalledWith('project-new');
    expect(projectsServiceMock.loadGroupedSearchCounts).toHaveBeenCalledOnce();
    expect(component.projects()[0]?.id).toBe('project-new');
    expect(component.editingProjectId()).toBeNull();
    expect(component.workspaceTitleEditProjectId()).toBe('project-new');
    expect(component.workspaceTitleEditValue()).toBe('Untitled project');
    expect(component.creatingProject()).toBe(false);
  });

  it('renames project from workspace title input on Enter submit', async () => {
    const nowIso = new Date().toISOString();
    projectsServiceMock.renameProject.mockResolvedValue(true);
    component.projects.set([
      {
        id: 'project-new',
        name: 'Untitled project',
        colorKey: 'clay',
        archivedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        status: 'active',
        totalImageCount: 0,
        matchingImageCount: 0,
        lastActivity: null,
        city: null,
        district: null,
        street: null,
        country: null,
      },
    ]);
    component.selectedProjectId.set('project-new');
    component.workspaceTitleEditProjectId.set('project-new');
    component.workspaceTitleEditValue.set('Untitled project');

    component.onWorkspaceTitleChanged('Bridge site');
    await component.onWorkspaceTitleSubmit('Bridge site');

    expect(projectsServiceMock.renameProject).toHaveBeenCalledWith('project-new', 'Bridge site');
    expect(component.projects()[0]?.name).toBe('Bridge site');
    expect(component.workspaceTitleEditProjectId()).toBeNull();
    expect(component.workspaceTitleEditValue()).toBe('');
  });

  it('shows an error toast when draft project creation fails', async () => {
    projectsServiceMock.createDraftProject.mockResolvedValue(null);

    await component.onNewProject();

    expect(toastServiceMock.show).toHaveBeenCalledWith({
      message: 'Could not create project. Please try again.',
      type: 'error',
      dedupe: true,
    });
    expect(component.projects()).toHaveLength(0);
    expect(component.creatingProject()).toBe(false);
  });
});
