import { TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { ToastService } from '../../core/toast.service';
import { ProjectsPageComponent } from './projects-page.component';
import { ProjectsToolbarComponent } from './projects-toolbar.component';
import type { ProjectListItem } from '../../core/projects/projects.types';
import type { SortConfig } from '../../core/workspace-view.types';

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
    ...overrides,
  };
}

describe('ProjectsPageComponent', () => {
  const projectsServiceMock = {
    loadProjects: vi.fn().mockResolvedValue([]),
    createDraftProject: vi.fn().mockResolvedValue(null),
    setProjectColor: vi.fn().mockResolvedValue(true),
    archiveProject: vi.fn().mockResolvedValue(true),
    restoreProject: vi.fn().mockResolvedValue(true),
    deleteProject: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    TestBed.overrideComponent(ProjectsPageComponent, {
      remove: {
        imports: [ProjectsToolbarComponent],
      },
      add: {
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    await TestBed.configureTestingModule({
      imports: [ProjectsPageComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/projects',
            events: new Subject<unknown>().asObservable(),
            navigate: vi.fn(),
            createUrlTree: vi.fn().mockReturnValue('/projects'),
            serializeUrl: vi.fn((value: unknown) => String(value)),
          },
        },
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
      ],
    }).compileComponents();
  });

  it('renders an explicit load error state when project loading fails', async () => {
    projectsServiceMock.loadProjects.mockRejectedValueOnce(new Error('load failed'));

    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorPanel = (fixture.nativeElement as HTMLElement).querySelector('.projects-error');
    expect(errorPanel).not.toBeNull();
    expect(errorPanel?.textContent).toContain('Could not load projects');
    expect(errorPanel?.textContent).toContain('Retry');
  });

  it('applies aria-sort semantics to table headers from the active primary sort', async () => {
    projectsServiceMock.loadProjects.mockResolvedValueOnce([createProject()]);

    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.viewMode.set('list');
    component.projects.set([createProject()]);
    component.activeSorts.set([{ key: 'name', direction: 'asc' } as SortConfig]);
    fixture.detectChanges();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.projects-table thead th',
    );
    expect(headers.length).toBe(7);
    expect(headers[0]?.getAttribute('aria-sort')).toBe('ascending');
    expect(headers[1]?.getAttribute('aria-sort')).toBe('none');
    expect(headers[2]?.getAttribute('aria-sort')).toBe('none');
    expect(headers[3]?.getAttribute('aria-sort')).toBe('none');
    expect(headers[4]?.getAttribute('aria-sort')).toBe('none');
    expect(headers[5]?.getAttribute('aria-sort')).toBe('none');
    expect(headers[6]?.getAttribute('aria-sort')).toBe('none');
  });

  it('renders semantic table structure in list mode', async () => {
    projectsServiceMock.loadProjects.mockResolvedValueOnce([createProject()]);

    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.viewMode.set('list');
    component.projects.set([createProject()]);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const table = host.querySelector('.projects-table');
    const rowHeaderCell = host.querySelector('.projects-table tbody th[scope="row"]');
    const headerLabels = Array.from(host.querySelectorAll('.projects-table thead th')).map(
      (node) => node.textContent?.trim(),
    );
    expect(table).not.toBeNull();
    expect(host.querySelector('.projects-table thead')).not.toBeNull();
    expect(host.querySelector('.projects-table tbody')).not.toBeNull();
    expect(rowHeaderCell?.textContent).toContain('Pilot Project');
    expect(headerLabels).toEqual([
      'Name',
      'Image count',
      'Status',
      'Primary district',
      'Primary city',
      'Updated',
      'Last activity',
    ]);
  });

  it('shows breadcrumb current-page semantics on detail routes', async () => {
    projectsServiceMock.loadProjects.mockResolvedValueOnce([
      createProject({ id: 'project-42', name: 'Site 42' }),
    ]);

    const router = TestBed.inject(Router) as unknown as { url: string };
    router.url = '/projects/project-42';

    const fixture = TestBed.createComponent(ProjectsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.projects.set([createProject({ id: 'project-42', name: 'Site 42' })]);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const breadcrumb = host.querySelector('.projects-breadcrumbs');
    const current = host.querySelector('.projects-breadcrumbs__item--current');
    expect(breadcrumb).not.toBeNull();
    expect(current?.textContent).toContain('Site 42');
  });
});
