import { Injectable, signal } from '@angular/core';
import type { ProjectSelectOption } from '../../../shared/project-select-dialog/project-select-dialog.component';

@Injectable()
export class MapShellState {
  readonly photoPanelOpen = signal(false);
  readonly workspacePaneWidth = signal(360);
  readonly selectedMarkerKey = signal<string | null>(null);
  readonly selectedMarkerKeys = signal<Set<string>>(new Set());
  readonly linkedHoveredWorkspaceMediaIds = signal<Set<string>>(new Set());

  readonly mapContextMenuOpen = signal(false);
  readonly mapContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly mapContextMenuCoords = signal<{ lat: number; lng: number } | null>(null);
  readonly radiusContextMenuOpen = signal(false);
  readonly radiusContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly radiusContextMenuCoords = signal<{ lat: number; lng: number } | null>(null);
  readonly markerContextMenuOpen = signal(false);
  readonly markerContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly markerContextMenuPayload = signal<{
    markerKey: string;
    count: number;
    lat: number;
    lng: number;
    mediaId?: string;
    isMultiSelection?: boolean;
    sourceCells: Array<{ lat: number; lng: number }>;
  } | null>(null);

  readonly draftMediaMarker = signal<{ lat: number; lng: number; uploadCount: number } | null>(
    null,
  );

  readonly projectSelectionDialogOpen = signal(false);
  readonly projectSelectionDialogTitle = signal('Projekt auswaehlen');
  readonly projectSelectionDialogMessage = signal('');
  readonly projectSelectionDialogOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectSelectionDialogSelectedId = signal<string | null>(null);

  readonly projectNameDialogOpen = signal(false);
  readonly projectNameDialogTitle = signal('Name fuer neues Projekt aus Radius');
  readonly projectNameDialogMessage = signal('Gib einen Projektnamen ein.');
  readonly projectNameDialogInitialValue = signal('');

  readonly batchAddressDialogOpen = signal(false);
  readonly batchAddressDialogTitle = signal('Adresse fuer Auswahl aendern');
  readonly batchAddressDialogMessage = signal('Adresse fuer alle ausgewaehlten Medien anwenden.');
  readonly batchAddressTargetMediaIds = signal<ReadonlyArray<string>>([]);

  readonly detailMediaId = signal<string | null>(null);

  /** Detail view address-search handoff (map shell consumes in media detail flow). */
  readonly detailAddressSearchRequest = signal<{ mediaId: string; requestId: number } | null>(null);
}
