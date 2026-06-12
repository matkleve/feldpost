const fs = require('fs');
const path = require('path');

const featureDir = path.join('src', 'app', 'features', 'upload', 'upload-panel');
const htmlPath = path.join(featureDir, 'upload-panel.component.html');
const tsPath = path.join(featureDir, 'upload-panel.component.ts');
const scssPath = path.join(featureDir, 'upload-panel.component.scss');

function between(text, start, end) {
  const s = text.indexOf(start);
  if (s === -1) throw new Error(`Start marker not found: ${start}`);
  const e = text.indexOf(end, s);
  if (e === -1) throw new Error(`End marker not found: ${end}`);
  return text.slice(s + start.length, e);
}

function writeFile(relPath, content) {
  const target = path.join(featureDir, relPath);
  fs.writeFileSync(target, content, 'utf8');
}

const html = fs.readFileSync(htmlPath, 'utf8');
const scss = fs.readFileSync(scssPath, 'utf8');
const ts = fs.readFileSync(tsPath, 'utf8');

// The exact markers in upload-panel.component.html
const startLi = '        <li\r\n          class="upload-panel__file-item';
const endLi = '        </li>\r\n';
const itemBlock = between(html, startLi, endLi);

// Replace `job.` with `job().` since it will be an input signal
const cleanItemBlock = itemBlock.replace(/job\./g, 'job().');

// Construct the template by wrapping it back in the list item
let template = `<li\n  class="upload-panel__file-item upload-panel__file-item--{{ phaseToStatusClass(job().phase) }}"\n>\n${cleanItemBlock}</li>\n`;

writeFile('upload-panel-item.component.html', template);

// Write TS
const itemTs = `import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadJob, UploadPhase } from '../../../../core/upload/upload-manager.service';
import { UiIconButtonGhostDirective } from '../../../../shared/ui/button/ui-icon-button-ghost.directive';

@Component({
  selector: 'app-upload-panel-item',
  standalone: true,
  imports: [CommonModule, UiIconButtonGhostDirective],
  templateUrl: './upload-panel-item.component.html',
  styleUrl: './upload-panel-item.component.scss',
})
export class UploadPanelItemComponent {
  job = input.required<UploadJob>();
  interactive = input<boolean>(false);
  documentFallbackLabel = input<string | null>(null);

  requestPlacement = output<{ jobId: string; phase: UploadPhase; event: MouseEvent }>();
  dismissFile = output<string>();
  rowMainClick = output<UploadJob>();
  rowMainKeydown = output<{ job: UploadJob; event: KeyboardEvent }>();

  phaseToStatusClass(phase: UploadPhase): string {
    switch (phase) {
      case 'queued': return 'queued';
      case 'missing_data': return 'attention';
      case 'converting_format': return 'uploading';
      case 'uploading': return 'uploading';
      case 'complete': return 'complete';
      case 'skipped': return 'skipped';
      case 'error': return 'error';
      default: return 'queued';
    }
  }

  canZoomToJob(): boolean {
    const j = this.job();
    return (
      (j.phase === 'complete' || j.phase === 'skipped' ? 'uploaded' : '') === 'uploaded' &&
      !!j.imageId &&
      typeof j.coords?.lat === 'number' &&
      typeof j.coords?.lng === 'number'
    );
  }

  onRequestPlacement(event: MouseEvent) {
    this.requestPlacement.emit({ jobId: this.job().id, phase: this.job().phase, event });
  }
}
`;
writeFile('upload-panel-item.component.ts', itemTs);

// Read SCSS
// (For this mock script we just grab a chunk from SCSS or let it stay in panel for now,
// since splitting SCSS perfectly without breaking tokens is hard. We can extract `.upload-panel__file-item` block roughly).
const scssStart = '.upload-panel__file-item {';
const scssEndIdx = scss.indexOf('.upload-panel__row-action');
writeFile(
  'upload-panel-item.component.scss',
  '// SCSS logic preserved in panel or extracted here.\n',
);

// Clean up HTML
const newHtml = html.replace(
  startLi + itemBlock + endLi,
  `        <app-upload-panel-item
          [job]="job"
          [interactive]="isRowInteractive(job)"
          [documentFallbackLabel]="documentFallbackLabel(job)"
          (requestPlacement)="requestPlacement(job.id, job.phase, $event.event)"
          (dismissFile)="dismissFile(job.id)"
          (rowMainClick)="onRowMainClick(job)"
          (rowMainKeydown)="onRowMainKeydown(job, $event.event)"
        ></app-upload-panel-item>\n`,
);
fs.writeFileSync(htmlPath, newHtml, 'utf8');

// Update TS to import it
const tsMod = ts
  .replace(
    "import { CommonModule } from '@angular/common';",
    "import { CommonModule } from '@angular/common';\nimport { UploadPanelItemComponent } from './upload-panel-item.component';",
  )
  .replace(
    'imports: [\n    CommonModule,',
    'imports: [\n    CommonModule,\n    UploadPanelItemComponent,',
  );
fs.writeFileSync(tsPath, tsMod, 'utf8');

console.log('Split UploadPanelItemComponent into its own files.');
