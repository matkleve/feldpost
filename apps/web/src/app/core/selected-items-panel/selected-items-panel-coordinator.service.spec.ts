import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SelectedItemsPanelCoordinatorService } from './selected-items-panel-coordinator.service';
import { ShellLayoutService } from '../shell-layout/shell-layout.service';
import { ShellPanelColumnResizeService } from '../shell-layout/shell-panel-column-resize.service';
import { SHELL_PANEL_COLUMN_DEFAULT_WIDTH_PX } from '../shell-layout/shell-panel-column-resize.constants';

describe('SelectedItemsPanelCoordinatorService', () => {
  function setup(): {
    coordinator: SelectedItemsPanelCoordinatorService;
    shellLayout: ShellLayoutService;
  } {
    TestBed.configureTestingModule({
      providers: [
        SelectedItemsPanelCoordinatorService,
        ShellLayoutService,
        {
          provide: ShellPanelColumnResizeService,
          useValue: {
            panelColumnWidthPx: signal(SHELL_PANEL_COLUMN_DEFAULT_WIDTH_PX),
          },
        },
      ],
    });

    return {
      coordinator: TestBed.inject(SelectedItemsPanelCoordinatorService),
      shellLayout: TestBed.inject(ShellLayoutService),
    };
  }

  it('opens the download panel', () => {
    const { coordinator, shellLayout } = setup();

    coordinator.open();

    expect(shellLayout.isOpen('share')).toBe(true);
    expect(coordinator.isOpen()).toBe(true);
  });

  it('respects user dismiss until explicit open resets it', () => {
    const { coordinator, shellLayout } = setup();

    coordinator.onDownloadPanelUserDismissed();
    coordinator.open({ respectUserDismiss: true });

    expect(shellLayout.isOpen('share')).toBe(false);

    coordinator.open();

    expect(shellLayout.isOpen('share')).toBe(true);
  });

  it('reports map offset from download panel width', () => {
    const { coordinator, shellLayout } = setup();

    shellLayout.open('share');

    expect(coordinator.getMapPaneOffsetPx()).toBe(SHELL_PANEL_COLUMN_DEFAULT_WIDTH_PX / 2);
  });
});
