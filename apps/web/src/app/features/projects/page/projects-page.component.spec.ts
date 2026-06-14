import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProjectsService } from '../../../core/projects/projects.service';
import { ToastService } from '../../../core/toast/toast.service';
import { WorkspacePaneObserverAdapter } from '../../../core/workspace-pane/workspace-pane-observer.adapter';
import { ProjectsPageComponent } from './projects-page.component';
import type { ProjectListItem } from '../../../core/projects/projects.types';
import { Subject } from 'rxjs';

function createProject(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    id: 'project-1',
    name: 'Pilot Project',
    colorKey: 'clay',
    archivedAt: null,
    createdAt: '2026-03-20T10:00:00.000Z',
    updatedAt: '2026-03-20T10:00:00.000Z',
    status: 'active',
    totalImageCount: 12,
    matchingImageCount: 12,
    lastActivity: '2026-03-20T10:00:00.000Z',
    city: 'Vienna',
    district: 'Leopoldstadt',
    street: 'Praterstrasse 1',
    country: 'AT',
    fileTypeCounts: [],
    ...overrides,
  };
}

describe('ProjectsPageComponent', () => {
  const projectsServiceMock = {
    loadProjects: vi.fn().mockResolvedValue([]),
    loadProjectMediaSections: vi.fn().mockResolvedValue({ exclusive: [], shared: [] }),
    createDraftProject: vi.fn().mockResolvedValue(null),
    renameProject: vi.fn().mockResolvedValue(true),
    setProjectColor: vi.fn().mockResolvedValue(true),
    archiveProject: vi.fn().mockResolvedValue(true),
    restoreProject: vi.fn().mockResolvedValue(true),
    deleteProject: vi.fn().mockResolvedValue(true),
  };

  const routerMock = {
    url: '/projects',
    events: new Subject<unknown>().asObservable(),
    navigate: vi.fn(),
    createUrlTree: vi.fn().mockReturnValue('/projects'),
    serializeUrl: vi.fn((value: unknown) => String(value)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    routerMock.url = '/projects';

    await TestBed.configureTestingModule({
      imports: [ProjectsPageComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {},
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: (_key: string, fallback = '') => fallback,
          },
        },
        { provide: ProjectsService, useValue: projectsServiceMock },
        {
          provide: ToastService,
          useValue: {
            show: vi.fn(),
          },
        },
        {
          provide: WorkspacePaneObserverAdapter,
          useValue: {
            onContextRebind: vi.fn(),
            onRouteLeave: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders an explicit load error state when project loading fails', async () => {
    projectsServiceMock.loadProjects.mockRejectedValueOnce(new Error('load failed'));

    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorPanel = (fixture.nativeElement as HTMLElement).querySelector('.projects-page__error');
    expect(errorPanel).not.toBeNull();
    expect(errorPanel?.textContent).toContain('Could not load projects');
    expect(errorPanel?.textContent).toContain('Retry');
  });

  it('shows dashboard view on /projects without a selected project', async () => {
    projectsServiceMock.loadProjects.mockResolvedValueOnce([createProject()]);

    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-project-dashboard-view')).not.toBeNull();
    expect(host.querySelector('app-project-detail-view')).toBeNull();
  });

  it('loads project media when route has a project id', async () => {
    projectsServiceMock.loadProjects.mockResolvedValueOnce([
      createProject({ id: 'project-42', name: 'Site 42' }),
    ]);
    routerMock.url = '/projects/project-42';

    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.currentProjectId()).toBe('project-42');
    expect(fixture.componentInstance.currentProject()?.name).toBe('Site 42');
    expect(projectsServiceMock.loadProjectMediaSections).toHaveBeenCalledWith('project-42');
  });

  it('opens project-name dialog without creating a project immediately', async () => {
    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.onNewProject();

    expect(component.projectNameDialogOpen()).toBe(true);
    expect(projectsServiceMock.createDraftProject).not.toHaveBeenCalled();
  });

  it('creates and renames a project after project-name confirmation', async () => {
    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const created = createProject({ id: 'project-created', name: 'Draft Project' });
    projectsServiceMock.createDraftProject.mockResolvedValueOnce(created);
    projectsServiceMock.renameProject.mockResolvedValueOnce(true);

    const component = fixture.componentInstance;
    component.onNewProject();
    await component.onProjectNameDialogConfirmed('Bridge Alpha');

    expect(component.projectNameDialogOpen()).toBe(false);
    expect(projectsServiceMock.createDraftProject).toHaveBeenCalledTimes(1);
    expect(projectsServiceMock.renameProject).toHaveBeenCalledWith('project-created', 'Bridge Alpha');
    expect(component.projects()[0]?.name).toBe('Bridge Alpha');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/projects', 'project-created']);
  });
});
