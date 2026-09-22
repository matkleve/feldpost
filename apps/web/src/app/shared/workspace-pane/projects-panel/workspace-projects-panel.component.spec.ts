import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProjectsService } from '../../../core/projects/projects.service';
import { ToastService } from '../../../core/toast/toast.service';
import { MapContextActionsService } from '../../../features/map/map-shell/context-menu/map-context-actions.service';
import type { ProjectListItem } from '../../../core/projects/projects.types';
import { WorkspaceProjectsPanelComponent } from './workspace-projects-panel.component';

// Contract under test:
// docs/specs/ui/workspace/workspace-pane-projects-tab.destructive-actions.supplement.md

function createProject(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    id: 'project-1',
    name: 'Baustelle Wien 1010',
    colorKey: 'clay',
    locationRequired: false, // deprecated, always false — docs/architecture/deprecated-schema.md
    archivedAt: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    status: 'active',
    totalImageCount: 340,
    matchingImageCount: 340,
    lastActivity: '2026-09-20T10:00:00.000Z',
    city: 'Wien',
    district: 'Innere Stadt',
    street: 'Praterstrasse 1',
    country: 'AT',
    fileTypeCounts: [],
    ...overrides,
  };
}

const archivedProject = (): ProjectListItem =>
  createProject({
    id: 'project-archived',
    name: 'Baustelle Graz 8010',
    status: 'archived',
    archivedAt: '2026-09-21T10:00:00.000Z',
  });

// Explicit DI seams, not vi.mock — @see docs/TRAPS.md TRAP-022
const projectsServiceMock = {
  loadProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn().mockResolvedValue(null),
  renameProject: vi.fn().mockResolvedValue(true),
  setProjectColor: vi.fn().mockResolvedValue(true),
  archiveProject: vi.fn().mockResolvedValue(true),
  restoreProject: vi.fn().mockResolvedValue(true),
  deleteProject: vi.fn().mockResolvedValue(true),
};

const toastServiceMock = { show: vi.fn() };

beforeEach(async () => {
  vi.clearAllMocks();
  projectsServiceMock.loadProjects.mockResolvedValue([]);
  projectsServiceMock.deleteProject.mockResolvedValue(true);

  await TestBed.configureTestingModule({
    imports: [WorkspaceProjectsPanelComponent],
    providers: [
      { provide: ProjectsService, useValue: projectsServiceMock },
      { provide: ToastService, useValue: toastServiceMock },
      {
        provide: MapContextActionsService,
        useValue: { assignImagesToProject: vi.fn().mockResolvedValue({ ok: true }) },
      },
      { provide: I18nService, useValue: { t: (_key: string, fallback = '') => fallback } },
      { provide: Router, useValue: { url: '/map', navigate: vi.fn().mockResolvedValue(true) } },
    ],
  }).compileComponents();
});

/** Mounts the panel with `projects` loaded and the given project open in detail state. */
async function openDetail(project: ProjectListItem) {
  projectsServiceMock.loadProjects.mockResolvedValue([project]);

  const fixture = TestBed.createComponent(WorkspaceProjectsPanelComponent);
  fixture.detectChanges();
  await fixture.whenStable();

  fixture.componentInstance.openDetail(project.id);
  fixture.detectChanges();

  return fixture;
}

function deleteButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>('.projects-panel-detail__action-btn--danger');
}

// app-confirm-dialog mounts its content through a CDK portal, so query the document.
const confirmButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>('.dialog__confirm');
const cancelButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>('.dialog__cancel');

describe('WorkspaceProjectsPanelComponent — delete needs confirmation', () => {
  it('does not call deleteProject when Delete is clicked without confirming', async () => {
    const fixture = await openDetail(archivedProject());

    const button = deleteButton(fixture.nativeElement);
    expect(button).not.toBeNull();

    button?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectsServiceMock.deleteProject).not.toHaveBeenCalled();
    expect(confirmButton()).not.toBeNull();
  });

  it('calls deleteProject only after the confirm dialog is confirmed', async () => {
    const fixture = await openDetail(archivedProject());

    deleteButton(fixture.nativeElement)?.click();
    fixture.detectChanges();
    expect(projectsServiceMock.deleteProject).not.toHaveBeenCalled();

    const confirm = confirmButton();
    expect(confirm).not.toBeNull();
    confirm?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectsServiceMock.deleteProject).toHaveBeenCalledWith('project-archived');
    expect(fixture.componentInstance.projects()).toHaveLength(0);
  });

  it('does not call deleteProject when the confirm dialog is cancelled', async () => {
    const fixture = await openDetail(archivedProject());

    deleteButton(fixture.nativeElement)?.click();
    fixture.detectChanges();

    const cancel = cancelButton();
    expect(cancel).not.toBeNull();
    cancel?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectsServiceMock.deleteProject).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projects()).toHaveLength(1);
    // Any dismissal — Cancel or Escape — arrives as `cancelled`; the dialog owns that
    // mapping since #254, so clearing the signal here is all the panel has to do.
    expect(fixture.componentInstance.pendingDeleteProjectId()).toBeNull();
  });
});

describe('WorkspaceProjectsPanelComponent — dialog dismissal is idempotent', () => {
  it('deletes once when the confirm button is double-clicked', async () => {
    const fixture = await openDetail(archivedProject());

    deleteButton(fixture.nativeElement)?.click();
    fixture.detectChanges();

    const confirm = confirmButton();
    confirm?.click();
    confirm?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectsServiceMock.deleteProject).toHaveBeenCalledTimes(1);
  });
});

describe('WorkspaceProjectsPanelComponent — delete is archived-only', () => {
  it('does not offer Delete for an active project (RLS deletes archived rows only)', async () => {
    const fixture = await openDetail(createProject());

    expect(deleteButton(fixture.nativeElement)).toBeNull();
  });

  it('offers Delete for an archived project', async () => {
    const fixture = await openDetail(archivedProject());

    expect(deleteButton(fixture.nativeElement)).not.toBeNull();
  });
});

describe('WorkspaceProjectsPanelComponent — failed delete is reported', () => {
  it('shows an error toast instead of failing silently', async () => {
    projectsServiceMock.deleteProject.mockResolvedValue(false);

    const fixture = await openDetail(archivedProject());

    deleteButton(fixture.nativeElement)?.click();
    fixture.detectChanges();
    confirmButton()?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toastServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    expect(fixture.componentInstance.projects()).toHaveLength(1);
  });
});
