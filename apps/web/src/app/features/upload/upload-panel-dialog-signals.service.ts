/**
 * UploadPanelDialogSignals — All dialog state signals in one place.
 *
 * Extracted from UploadPanelComponent to reduce its size and simplify state management.
 * This service provides all dialog-related signals and methods to update them.
 */

import { Injectable, signal } from '@angular/core';
import type { ForwardGeocodeResult } from '../../core/geocoding/geocoding.service';
import type { ProjectSelectOption } from '../../shared/project-select-dialog/project-select-dialog.component';
import type { UploadJob } from '../../core/upload/upload-manager.service';

@Injectable()
export class UploadPanelDialogSignals {
  // ── Location Address Dialog ────────────────────────────────────────────

  private readonly _locationAddressDialogOpen = signal(false);
  readonly locationAddressDialogOpen = this._locationAddressDialogOpen.asReadonly();

  private readonly _locationAddressDialogQuery = signal('');
  readonly locationAddressDialogQuery = this._locationAddressDialogQuery.asReadonly();

  private readonly _locationAddressDialogLoading = signal(false);
  readonly locationAddressDialogLoading = this._locationAddressDialogLoading.asReadonly();

  private readonly _locationAddressDialogSuggestions = signal<ForwardGeocodeResult[]>([]);
  readonly locationAddressDialogSuggestions = this._locationAddressDialogSuggestions.asReadonly();

  private readonly _pendingLocationAddressJob = signal<UploadJob | null>(null);
  readonly pendingLocationAddressJob = this._pendingLocationAddressJob.asReadonly();

  private locationAddressSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  // ── Project Selection Dialog ───────────────────────────────────────────

  private readonly _projectSelectionDialogOpen = signal(false);
  readonly projectSelectionDialogOpen = this._projectSelectionDialogOpen.asReadonly();

  private readonly _projectSelectionDialogTitle = signal('');
  readonly projectSelectionDialogTitle = this._projectSelectionDialogTitle.asReadonly();

  private readonly _projectSelectionDialogMessage = signal('');
  readonly projectSelectionDialogMessage = this._projectSelectionDialogMessage.asReadonly();

  private readonly _projectSelectionDialogOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectSelectionDialogOptions = this._projectSelectionDialogOptions.asReadonly();

  private readonly _projectSelectionDialogSelectedId = signal<string | null>(null);
  readonly projectSelectionDialogSelectedId = this._projectSelectionDialogSelectedId.asReadonly();

  private readonly _pendingProjectAssignmentJob = signal<UploadJob | null>(null);
  readonly pendingProjectAssignmentJob = this._pendingProjectAssignmentJob.asReadonly();

  private readonly _projectNameDialogOpen = signal(false);
  readonly projectNameDialogOpen = this._projectNameDialogOpen.asReadonly();

  private readonly _projectNameDialogTitle = signal('');
  readonly projectNameDialogTitle = this._projectNameDialogTitle.asReadonly();

  private readonly _projectNameDialogMessage = signal('');
  readonly projectNameDialogMessage = this._projectNameDialogMessage.asReadonly();

  private readonly _projectNameDialogInitialValue = signal('');
  readonly projectNameDialogInitialValue = this._projectNameDialogInitialValue.asReadonly();

  // ── Duplicate Resolution Dialog ────────────────────────────────────────

  private readonly _duplicateResolutionDialogOpen = signal(false);
  readonly duplicateResolutionDialogOpen = this._duplicateResolutionDialogOpen.asReadonly();

  private readonly _duplicateResolutionApplyToBatch = signal(false);
  readonly duplicateResolutionApplyToBatch = this._duplicateResolutionApplyToBatch.asReadonly();

  private readonly _pendingDuplicateResolutionJob = signal<UploadJob | null>(null);
  readonly pendingDuplicateResolutionJob = this._pendingDuplicateResolutionJob.asReadonly();

  // ── Location Address Dialog Setters ────────────────────────────────────

  setLocationAddressDialogOpen(value: boolean): void {
    this._locationAddressDialogOpen.set(value);
  }

  setLocationAddressDialogQuery(value: string): void {
    this._locationAddressDialogQuery.set(value);
  }

  setLocationAddressDialogLoading(value: boolean): void {
    this._locationAddressDialogLoading.set(value);
  }

  setLocationAddressDialogSuggestions(value: ForwardGeocodeResult[]): void {
    this._locationAddressDialogSuggestions.set(value);
  }

  setPendingLocationAddressJob(job: UploadJob | null): void {
    this._pendingLocationAddressJob.set(job);
  }

  getLocationAddressSearchTimeout(): ReturnType<typeof setTimeout> | null {
    return this.locationAddressSearchTimeout;
  }

  setLocationAddressSearchTimeout(timeout: ReturnType<typeof setTimeout> | null): void {
    this.locationAddressSearchTimeout = timeout;
  }

  // ── Project Selection Dialog Setters ───────────────────────────────────

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

  setPendingProjectAssignmentJob(job: UploadJob | null): void {
    this._pendingProjectAssignmentJob.set(job);
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

  // ── Duplicate Resolution Dialog Setters ────────────────────────────────

  setDuplicateResolutionDialogOpen(value: boolean): void {
    this._duplicateResolutionDialogOpen.set(value);
  }

  setDuplicateResolutionApplyToBatch(value: boolean): void {
    this._duplicateResolutionApplyToBatch.set(value);
  }

  setPendingDuplicateResolutionJob(job: UploadJob | null): void {
    this._pendingDuplicateResolutionJob.set(job);
  }
}
