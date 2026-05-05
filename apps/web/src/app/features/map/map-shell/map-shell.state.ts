import { Injectable, signal } from '@angular/core';
import type { ProjectSelectOption } from '../../../shared/project-select-dialog/project-select-dialog.component';

@Injectable()
export class MapShellState {
  private readonly _photoPanelOpen = signal(false);
  readonly photoPanelOpen = this._photoPanelOpen.asReadonly();

  private readonly _workspacePaneWidth = signal(360);
  readonly workspacePaneWidth = this._workspacePaneWidth.asReadonly();

  private readonly _selectedMarkerKey = signal<string | null>(null);
  readonly selectedMarkerKey = this._selectedMarkerKey.asReadonly();

  private readonly _selectedMarkerKeys = signal<Set<string>>(new Set());
  readonly selectedMarkerKeys = this._selectedMarkerKeys.asReadonly();

  private readonly _linkedHoveredWorkspaceMediaIds = signal<Set<string>>(new Set());
  readonly linkedHoveredWorkspaceMediaIds = this._linkedHoveredWorkspaceMediaIds.asReadonly();

  private readonly _mapContextMenuOpen = signal(false);
  readonly mapContextMenuOpen = this._mapContextMenuOpen.asReadonly();

  private readonly _mapContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly mapContextMenuPosition = this._mapContextMenuPosition.asReadonly();

  private readonly _mapContextMenuCoords = signal<{ lat: number; lng: number } | null>(null);
  readonly mapContextMenuCoords = this._mapContextMenuCoords.asReadonly();

  private readonly _radiusContextMenuOpen = signal(false);
  readonly radiusContextMenuOpen = this._radiusContextMenuOpen.asReadonly();

  private readonly _radiusContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly radiusContextMenuPosition = this._radiusContextMenuPosition.asReadonly();

  private readonly _radiusContextMenuCoords = signal<{ lat: number; lng: number } | null>(null);
  readonly radiusContextMenuCoords = this._radiusContextMenuCoords.asReadonly();

  private readonly _markerContextMenuOpen = signal(false);
  readonly markerContextMenuOpen = this._markerContextMenuOpen.asReadonly();

  private readonly _markerContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly markerContextMenuPosition = this._markerContextMenuPosition.asReadonly();

  private readonly _markerContextMenuPayload = signal<{
    markerKey: string;
    count: number;
    lat: number;
    lng: number;
    mediaId?: string;
    isMultiSelection?: boolean;
    sourceCells: Array<{ lat: number; lng: number }>;
  } | null>(null);
  readonly markerContextMenuPayload = this._markerContextMenuPayload.asReadonly();

  private readonly _draftMediaMarker = signal<{ lat: number; lng: number; uploadCount: number } | null>(null);
  readonly draftMediaMarker = this._draftMediaMarker.asReadonly();

  private readonly _projectSelectionDialogOpen = signal(false);
  readonly projectSelectionDialogOpen = this._projectSelectionDialogOpen.asReadonly();

  private readonly _projectSelectionDialogTitle = signal('Projekt auswaehlen');
  readonly projectSelectionDialogTitle = this._projectSelectionDialogTitle.asReadonly();

  private readonly _projectSelectionDialogMessage = signal('');
  readonly projectSelectionDialogMessage = this._projectSelectionDialogMessage.asReadonly();

  private readonly _projectSelectionDialogOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectSelectionDialogOptions = this._projectSelectionDialogOptions.asReadonly();

  private readonly _projectSelectionDialogSelectedId = signal<string | null>(null);
  readonly projectSelectionDialogSelectedId = this._projectSelectionDialogSelectedId.asReadonly();

  private readonly _projectNameDialogOpen = signal(false);
  readonly projectNameDialogOpen = this._projectNameDialogOpen.asReadonly();

  private readonly _projectNameDialogTitle = signal('Name fuer neues Projekt aus Radius');
  readonly projectNameDialogTitle = this._projectNameDialogTitle.asReadonly();

  private readonly _projectNameDialogMessage = signal('Gib einen Projektnamen ein.');
  readonly projectNameDialogMessage = this._projectNameDialogMessage.asReadonly();

  private readonly _projectNameDialogInitialValue = signal('');
  readonly projectNameDialogInitialValue = this._projectNameDialogInitialValue.asReadonly();

  private readonly _batchAddressDialogOpen = signal(false);
  readonly batchAddressDialogOpen = this._batchAddressDialogOpen.asReadonly();

  private readonly _batchAddressDialogTitle = signal('Adresse fuer Auswahl aendern');
  readonly batchAddressDialogTitle = this._batchAddressDialogTitle.asReadonly();

  private readonly _batchAddressDialogMessage = signal('Adresse fuer alle ausgewaehlten Medien anwenden.');
  readonly batchAddressDialogMessage = this._batchAddressDialogMessage.asReadonly();

  private readonly _batchAddressTargetMediaIds = signal<ReadonlyArray<string>>([]);
  readonly batchAddressTargetMediaIds = this._batchAddressTargetMediaIds.asReadonly();

  private readonly _detailMediaId = signal<string | null>(null);
  readonly detailMediaId = this._detailMediaId.asReadonly();

  /** Detail view address-search handoff (map shell consumes in media detail flow). */
  private readonly _detailAddressSearchRequest = signal<{ mediaId: string; requestId: number } | null>(null);
  readonly detailAddressSearchRequest = this._detailAddressSearchRequest.asReadonly();

  setPhotoPanelOpen(value: boolean): void {
    this._photoPanelOpen.set(value);
  }

  setWorkspacePaneWidth(value: number): void {
    this._workspacePaneWidth.set(value);
  }

  setSelectedMarkerKey(value: string | null): void {
    this._selectedMarkerKey.set(value);
  }

  setSelectedMarkerKeys(value: Set<string>): void {
    this._selectedMarkerKeys.set(value);
  }

  setLinkedHoveredWorkspaceMediaIds(value: Set<string>): void {
    this._linkedHoveredWorkspaceMediaIds.set(value);
  }

  setMapContextMenuOpen(value: boolean): void {
    this._mapContextMenuOpen.set(value);
  }

  setMapContextMenuPosition(value: { x: number; y: number } | null): void {
    this._mapContextMenuPosition.set(value);
  }

  setMapContextMenuCoords(value: { lat: number; lng: number } | null): void {
    this._mapContextMenuCoords.set(value);
  }

  setRadiusContextMenuOpen(value: boolean): void {
    this._radiusContextMenuOpen.set(value);
  }

  setRadiusContextMenuPosition(value: { x: number; y: number } | null): void {
    this._radiusContextMenuPosition.set(value);
  }

  setRadiusContextMenuCoords(value: { lat: number; lng: number } | null): void {
    this._radiusContextMenuCoords.set(value);
  }

  setMarkerContextMenuOpen(value: boolean): void {
    this._markerContextMenuOpen.set(value);
  }

  setMarkerContextMenuPosition(value: { x: number; y: number } | null): void {
    this._markerContextMenuPosition.set(value);
  }

  setMarkerContextMenuPayload(
    value: {
      markerKey: string;
      count: number;
      lat: number;
      lng: number;
      mediaId?: string;
      isMultiSelection?: boolean;
      sourceCells: Array<{ lat: number; lng: number }>;
    } | null,
  ): void {
    this._markerContextMenuPayload.set(value);
  }

  setDraftMediaMarker(value: { lat: number; lng: number; uploadCount: number } | null): void {
    this._draftMediaMarker.set(value);
  }

  setProjectSelectionDialogOpen(value: boolean): void {
    this._projectSelectionDialogOpen.set(value);
  }

  setProjectSelectionDialogTitle(value: string): void {
    this._projectSelectionDialogTitle.set(value);
  }

  setProjectSelectionDialogMessage(value: string): void {
    this._projectSelectionDialogMessage.set(value);
  }

  setProjectSelectionDialogOptions(value: ReadonlyArray<ProjectSelectOption>): void {
    this._projectSelectionDialogOptions.set(value);
  }

  setProjectSelectionDialogSelectedId(value: string | null): void {
    this._projectSelectionDialogSelectedId.set(value);
  }

  setProjectNameDialogOpen(value: boolean): void {
    this._projectNameDialogOpen.set(value);
  }

  setProjectNameDialogTitle(value: string): void {
    this._projectNameDialogTitle.set(value);
  }

  setProjectNameDialogMessage(value: string): void {
    this._projectNameDialogMessage.set(value);
  }

  setProjectNameDialogInitialValue(value: string): void {
    this._projectNameDialogInitialValue.set(value);
  }

  setBatchAddressDialogOpen(value: boolean): void {
    this._batchAddressDialogOpen.set(value);
  }

  setBatchAddressDialogTitle(value: string): void {
    this._batchAddressDialogTitle.set(value);
  }

  setBatchAddressDialogMessage(value: string): void {
    this._batchAddressDialogMessage.set(value);
  }

  setBatchAddressTargetMediaIds(value: ReadonlyArray<string>): void {
    this._batchAddressTargetMediaIds.set(value);
  }

  setDetailMediaId(value: string | null): void {
    this._detailMediaId.set(value);
  }

  setDetailAddressSearchRequest(value: { mediaId: string; requestId: number } | null): void {
    this._detailAddressSearchRequest.set(value);
  }
}
