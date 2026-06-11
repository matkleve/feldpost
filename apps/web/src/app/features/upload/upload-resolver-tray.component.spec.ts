import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadResolverTrayOrchestratorService } from '../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { UploadLocationResolutionService } from '../../core/upload/location/upload-location-resolution.service';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import { UploadResolverTrayComponent } from './upload-resolver-tray.component';
import {
  MOCK_ORCHESTRATOR_BATCH_ID,
  UPLOAD_RESOLVER_TRAY_MOCK_ORCHESTRATOR_ITEMS,
} from './upload-resolver-tray.mock-orchestrator';

describe('UploadResolverTrayComponent', () => {
  let fixture: ComponentFixture<UploadResolverTrayComponent>;
  let orchestrator: UploadResolverTrayOrchestratorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadResolverTrayComponent],
      providers: [
        {
          provide: I18nService,
          useValue: { t: (_key: string, fallback: string) => fallback },
        },
        {
          provide: UploadManagerService,
          useValue: { jobs: signal([]) },
        },
        {
          provide: UploadLocationResolutionService,
          useValue: {
            pendingGroupCount: signal(0),
            disambiguationGroups: signal([]),
            activeGroup: signal(null),
          },
        },
        {
          provide: UploadPanelSignalsService,
          useValue: { passiveStatusLine: signal(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadResolverTrayComponent);
    orchestrator = TestBed.inject(UploadResolverTrayOrchestratorService);
    orchestrator.resetAll();
    orchestrator.presentBundleImmediately(
      MOCK_ORCHESTRATOR_BATCH_ID,
      structuredClone(UPLOAD_RESOLVER_TRAY_MOCK_ORCHESTRATOR_ITEMS),
    );
    fixture.detectChanges();
  });

  it('shows city options for first mock item (1A)', () => {
    const labels = fixture.nativeElement.querySelectorAll(
      '.upload-resolver-tray__choice-label',
    );
    const text = Array.from(labels as NodeListOf<Element>).map((el) => el.textContent?.trim());
    expect(text).toContain('Bern');
    expect(text).toContain('Zürich');
  });

  it('advances carousel within bundle on arrow navigation', () => {
    fixture.componentInstance.goToAdjacentGroup(1);
    fixture.detectChanges();
    const position = fixture.nativeElement.querySelector(
      '.upload-resolver-tray__nav-position',
    );
    expect(position?.textContent?.trim()).toBe('1B/3');
    fixture.componentInstance.goToAdjacentGroup(1);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.upload-resolver-tray__nav-position')?.textContent?.trim(),
    ).toBe('2/3');
  });

  it('resolves active item on Continue and advances dialogue', () => {
    fixture.componentInstance.selectOption('mock-city-bern');
    fixture.componentInstance.confirmSelection();
    fixture.detectChanges();
    const active = orchestrator.activeItem();
    expect(active?.trayStepLabel).toBe('1b');
  });

  it('shows Save on last dialogue unit when no presentation backlog', () => {
    orchestrator.resetAll();
    orchestrator.presentBundleImmediately(MOCK_ORCHESTRATOR_BATCH_ID, [
      {
        dialogueUnitId: 'only-source',
        producerId: 'mock',
        batchId: MOCK_ORCHESTRATOR_BATCH_ID,
        questionKey: 'upload.resolver.question.source',
        questionParams: { distance: '5 km', address: 'Test' },
        jobIds: ['mock-job-4'],
        folderDisplayPath: 'Folder/Path',
        options: [{ id: 'source-text', label: 'Folder addr', lat: 48, lng: 16 }],
      },
    ]);
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector(
      '.upload-resolver-tray__continue',
    );
    expect(footer?.textContent?.trim()).toMatch(/^Save$/);
    expect(
      fixture.nativeElement.querySelector('.upload-resolver-tray__nav-position'),
    ).toBeNull();
  });
});
