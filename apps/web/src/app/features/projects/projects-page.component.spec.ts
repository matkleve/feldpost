import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { ProjectsPageComponent } from './projects-page.component';
import { ProjectsService } from '../../core/projects/projects.service';
import { WorkspaceViewService } from '../../core/workspace-view.service';

const projectsServiceMock = {
  loadProjects: vi.fn(),
  loadGroupedSearchCounts: vi.fn(),
  createDraftProject: vi.fn(),
  renameProject: vi.fn(),
  archiveProject: vi.fn(),
  setProjectColor: vi.fn(),
  loadProjectWorkspaceImages: vi.fn(),
};

const workspaceViewServiceMock = {
  selectedProjectIds: signal<Set<string>>(new Set()),
  setActiveSelectionImages: vi.fn(),
  clearActiveSelection: vi.fn(),
};

const routerNavigate = vi.fn().mockResolvedValue(true);

describe('ProjectsPageComponent', () => {
  let fixture: ComponentFixture<ProjectsPageComponent>;
  let component: ProjectsPageComponent;

  beforeEach(async () => {
    vi.useFakeTimers();
    projectsServiceMock.loadProjects.mockResolvedValue([]);
    projectsServiceMock.loadGroupedSearchCounts.mockResolvedValue({});
    projectsServiceMock.loadProjectWorkspaceImages.mockResolvedValue([]);
    routerNavigate.mockClear();
    workspaceViewServiceMock.setActiveSelectionImages.mockClear();
    workspaceViewServiceMock.clearActiveSelection.mockClear();
    workspaceViewServiceMock.selectedProjectIds.set(new Set());

    await TestBed.configureTestingModule({
      imports: [ProjectsPageComponent],
      providers: [
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: WorkspaceViewService, useValue: workspaceViewServiceMock },
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
    vi.runAllTimers();

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
});
