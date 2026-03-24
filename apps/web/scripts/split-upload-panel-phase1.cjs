#!/usr/bin/env node
/**
 * split-upload-panel-phase1.cjs
 *
 * Splits UploadPanelComponent (425 lines) into logical services:
 * 1. upload-panel.component.ts (thin coordinator)
 * 2. upload-panel-state.service.ts (state signals)
 * 3. upload-panel-input-handlers.ts (file input)
 * 4. upload-panel-lane-handlers.ts (lane navigation)
 * 5. upload-panel-row-handlers.ts (row interaction)
 * 6. upload-panel-utils.ts (utilities)
 *
 * Strategy: Read original → identify blocks by text markers → 1:1 copy → new files
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/app/features/upload');
const componentPath = path.join(srcDir, 'upload-panel.component.ts');

if (!fs.existsSync(componentPath)) {
  console.error(`❌ File not found: ${componentPath}`);
  process.exit(1);
}

const content = fs.readFileSync(componentPath, 'utf-8');
const lines = content.split('\n');

console.log(`📄 Reading: upload-panel.component.ts (${lines.length} lines)\n`);

// ─────────────────────────────────────────────────────────────────────────────
// Markers & Extraction Helper
// ─────────────────────────────────────────────────────────────────────────────

const markers = {
  'state-start': (i) => /readonly laneBuckets/.test(lines[i]),
  'state-end': (i) => /readonly lastUploadLabel/.test(lines[i]),
  'input-start': (i) => /\/\/ ── Drag-and-drop ──/.test(lines[i]),
  'input-end': (i) => /\/\/ ── File input ──/.test(lines[i]),
  'lane-start': (i) => /setSelectedLane\(lane: UploadLane\)/.test(lines[i]),
  'lane-end': (i) => /onDotClick\(jobId: string\)/.test(lines[i]),
  'row-start': (i) => /requestPlacement\(jobId: string/.test(lines[i]),
  'row-end': (i) => /\/\/ ── Manual placement ──/.test(lines[i]),
  'utils-start': (i) => /documentFallbackLabel\(job: UploadJob\)/.test(lines[i]),
  'utils-end': (i) => /}$/.test(lines[i]),
};

function findLineIndex(marker) {
  for (let i = 0; i < lines.length; i++) {
    if (marker(i)) return i;
  }
  return -1;
}

const stateStart = findLineIndex(markers['state-start']);
const stateEnd = findLineIndex(markers['state-end']);
const inputStart = findLineIndex(markers['input-start']);
const inputEnd = findLineIndex(markers['input-end']);
const laneStart = findLineIndex(markers['lane-start']);
const laneEnd = findLineIndex(markers['lane-end']);
const rowStart = findLineIndex(markers['row-start']);
const rowEnd = findLineIndex(markers['row-end']);
const utilsStart = findLineIndex(markers['utils-start']);
const utilsEnd = lines.length - 1;

console.log(`✓ State block: ${stateStart + 1}–${stateEnd + 1}`);
console.log(`✓ Input block: ${inputStart + 1}–${inputEnd + 1}`);
console.log(`✓ Lane block: ${laneStart + 1}–${laneEnd + 1}`);
console.log(`✓ Row block: ${rowStart + 1}–${rowEnd + 1}`);
console.log(`✓ Utils block: ${utilsStart + 1}–${utilsEnd + 1}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// Extract blocks
// ─────────────────────────────────────────────────────────────────────────────

const blocks = {
  state: lines.slice(stateStart, stateEnd + 1).join('\n'),
  input: lines.slice(inputStart + 1, inputEnd).join('\n'),
  lane: lines.slice(laneStart, laneEnd + 1).join('\n'),
  row: lines.slice(rowStart, rowEnd).join('\n'),
  utils: lines.slice(utilsStart, utilsEnd + 1).join('\n'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Create new service files
// ─────────────────────────────────────────────────────────────────────────────

const files = {
  'upload-panel-state.service.ts': `/**
 * UploadPanelStateService — state signals and computed properties.
 *
 * Encapsulates lane bucketing, counting, and display state computations
 * so UploadPanelComponent remains a thin UI coordinator.
 */

import { Injectable, Signal, computed, signal } from '@angular/core';
import type { UploadBatch, UploadJob, UploadLane } from '../../core/upload/upload-manager.service';
import { getLaneForJob as mapJobToLane } from './upload-phase.helpers';

@Injectable({ providedIn: 'root' })
export class UploadPanelStateService {
  constructor(
    private readonly uploadManager: any, // Injected by DI
  ) {}

  ${blocks.state}
}
`,

  'upload-panel-input-handlers.ts': `/**
 * UploadPanelInputHandlersService — file input and drag-and-drop.
 *
 * Manages drag-and-drop, file picker, capture, and folder traversal events.
 */

import { Injectable, inject, signal } from '@angular/core';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../core/workspace-view.service';

@Injectable({ providedIn: 'root' })
export class UploadPanelInputHandlersService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly workspaceView = inject(WorkspaceViewService);

  readonly isDragging = signal(false);
  readonly selectedLane = signal('uploading');

  ${blocks.input}

  private activeProjectId(): string | undefined {
    const ids = this.workspaceView.selectedProjectIds();
    return ids.size > 0 ? (Array.from(ids.values())[0] ?? undefined) : undefined;
  }
}
`,

  'upload-panel-lane-handlers.ts': `/**
 * UploadPanelLaneHandlersService — lane navigation & selection.
 */

import { Injectable, signal } from '@angular/core';
import type { UploadJob, UploadLane } from '../../core/upload/upload-manager.service';
import { getLaneForJob as mapJobToLane } from './upload-phase.helpers';

@Injectable({ providedIn: 'root' })
export class UploadPanelLaneHandlersService {
  readonly selectedLane = signal<UploadLane>('uploading');
  readonly jobs = signal<UploadJob[]>([]);

  ${blocks.lane}

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }
}
`,

  'upload-panel-row-handlers.ts': `/**
 * UploadPanelRowHandlersService — row interaction & file management.
 */

import { Injectable, inject } from '@angular/core';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type { ExifCoords } from '../../core/upload/upload.service';
import { getLaneForJob as mapJobToLane } from './upload-phase.helpers';

export interface ZoomToLocationEvent {
  imageId: string;
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class UploadPanelRowHandlersService {
  private readonly uploadManager = inject(UploadManagerService);
  readonly jobs = signal<UploadJob[]>([]);

  ${blocks.row}

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }
}
`,

  'upload-panel-utils.ts': `/**
 * UploadPanelUtils — file type mapping and utility functions.
 */

import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import { phaseToStatusClass as mapPhaseToStatusClass } from './upload-phase.helpers';

${blocks.utils}
`,
};

// Write new files
Object.entries(files).forEach(([filename, content]) => {
  const filepath = path.join(srcDir, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`✅ Created: ${filename}`);
});

console.log(`\n🎯 Phase 1 split complete!`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Review: cd apps/web && npm run build`);
console.log(`   2. Fix imports in new services based on compiler errors`);
console.log(`   3. Update upload-panel.component.ts imports & delegations\n`);
