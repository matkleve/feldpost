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

describe('ProjectsPageComponent', () => {
  let fixture: ComponentFixture<ProjectsPageComponent>;
  let component: ProjectsPageComponent;

  beforeEach(async () => {
    projectsServiceMock.loadProjects.mockResolvedValue([]);
    projectsServiceMock.loadGroupedSearchCounts.mockResolvedValue({});

    await TestBed.configureTestingModule({
      imports: [ProjectsPageComponent],
      providers: [
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: WorkspaceViewService, useValue: workspaceViewServiceMock },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('defaults to list view mode', () => {
    expect(component.viewMode()).toBe('list');
  });

  it('updates status filter', () => {
    component.onStatusFilterChange('archived');
    expect(component.statusFilter()).toBe('archived');
  });
});
