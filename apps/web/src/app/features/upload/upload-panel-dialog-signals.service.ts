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

  readonly locationAddressDialogOpen = signal(false);
  readonly locationAddressDialogQuery = signal('');
  readonly locationAddressDialogLoading = signal(false);
  readonly locationAddressDialogSuggestions = signal<ForwardGeocodeResult[]>([]);
  readonly pendingLocationAddressJob = signal<UploadJob | null>(null);
  private locationAddressSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  // ── Project Selection Dialog ───────────────────────────────────────────

  readonly projectSelectionDialogOpen = signal(false);
  readonly projectSelectionDialogTitle = signal('');
  readonly projectSelectionDialogMessage = signal('');
  readonly projectSelectionDialogOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectSelectionDialogSelectedId = signal<string | null>(null);
  readonly pendingProjectAssignmentJob = signal<UploadJob | null>(null);
  readonly projectNameDialogOpen = signal(false);
  readonly projectNameDialogTitle = signal('');
  readonly projectNameDialogMessage = signal('');
  readonly projectNameDialogInitialValue = signal('');

  // ── Duplicate Resolution Dialog ────────────────────────────────────────

  readonly duplicateResolutionDialogOpen = signal(false);
  readonly duplicateResolutionApplyToBatch = signal(false);
  readonly pendingDuplicateResolutionJob = signal<UploadJob | null>(null);

  // ── Location Address Dialog Setters ────────────────────────────────────

  setLocationAddressDialogOpen(value: boolean): void {
    this.locationAddressDialogOpen.set(value);
  }

  setLocationAddressDialogQuery(value: string): void {
    this.locationAddressDialogQuery.set(value);
  }

  setLocationAddressDialogLoading(value: boolean): void {
    this.locationAddressDialogLoading.set(value);
  }

  setLocationAddressDialogSuggestions(value: ForwardGeocodeResult[]): void {
    this.locationAddressDialogSuggestions.set(value);
  }

  setPendingLocationAddressJob(job: UploadJob | null): void {
    this.pendingLocationAddressJob.set(job);
  }

  getLocationAddressSearchTimeout(): ReturnType<typeof setTimeout> | null {
    return this.locationAddressSearchTimeout;
  }

  setLocationAddressSearchTimeout(timeout: ReturnType<typeof setTimeout> | null): void {
    this.locationAddressSearchTimeout = timeout;
  }

  // ── Project Selection Dialog Setters ───────────────────────────────────

  setProjectSelectionDialogOpen(value: boolean): void {
    this.projectSelectionDialogOpen.set(value);
  }

  setProjectSelectionDialogTitle(value: string): void {
    this.projectSelectionDialogTitle.set(value);
  }

  setProjectSelectionDialogMessage(value: string): void {
    this.projectSelectionDialogMessage.set(value);
  }

  setProjectSelectionDialogOptions(value: ReadonlyArray<ProjectSelectOption>): void {
    this.projectSelectionDialogOptions.set(value);
  }

  setProjectSelectionDialogSelectedId(value: string | null): void {
    this.projectSelectionDialogSelectedId.set(value);
  }

  setPendingProjectAssignmentJob(job: UploadJob | null): void {
    this.pendingProjectAssignmentJob.set(job);
  }

  setProjectNameDialogOpen(value: boolean): void {
    this.projectNameDialogOpen.set(value);
  }

  setProjectNameDialogTitle(value: string): void {
    this.projectNameDialogTitle.set(value);
  }

  setProjectNameDialogMessage(value: string): void {
    this.projectNameDialogMessage.set(value);
  }

  setProjectNameDialogInitialValue(value: string): void {
    this.projectNameDialogInitialValue.set(value);
  }

  // ── Duplicate Resolution Dialog Setters ────────────────────────────────

  setDuplicateResolutionDialogOpen(value: boolean): void {
    this.duplicateResolutionDialogOpen.set(value);
  }

  setDuplicateResolutionApplyToBatch(value: boolean): void {
    this.duplicateResolutionApplyToBatch.set(value);
  }

  setPendingDuplicateResolutionJob(job: UploadJob | null): void {
    this.pendingDuplicateResolutionJob.set(job);
  }
}
