const fs = require('fs');
const path = require('path');

const featureDir = path.join('src', 'app', 'features', 'projects');
const htmlPath = path.join(featureDir, 'projects-page.component.html');
const scssPath = path.join(featureDir, 'projects-page.component.scss');

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

const headerBlock = between(html, '        <header class="projects-header">\n', '        </header>\n\n');
const listBlock = between(
  html,
  '                @if (viewMode() === \'list\') {\n',
  '                } @else {\n',
);
const gridBlock = between(
  html,
  '                } @else {\n',
  '                }\n',
);
const confirmBlock = between(
  html,
  '        @if (hasPendingAction()) {\n',
  '        }\n',
);

const headerTemplate = `<header class="projects-header">\n${headerBlock}        </header>\n`;
const tableTemplate = `<div\n  class="projects-list"\n  role="region"\n  [attr.aria-label]="t('projects.page.table.ariaLabel', 'Projects table')"\n>\n${listBlock}</div>\n`;
const gridTemplate = `<div class="projects-grid">\n${gridBlock}</div>\n`;
const confirmTemplate = `@if (open) {\n  <section class="projects-confirm" role="dialog" aria-modal="true">\n${confirmBlock}  </section>\n}\n`;

writeFile(
  'projects-page-header.component.ts',
`import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiButtonDirective, UiButtonPrimaryDirective } from '../../shared/ui-primitives.directive';

@Component({
  selector: 'app-projects-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink, UiButtonDirective, UiButtonPrimaryDirective],
  templateUrl: './projects-page-header.component.html',
  styleUrl: './projects-page-header.component.scss',
})
export class ProjectsPageHeaderComponent {
  readonly currentProjectId = input<string | null>(null);
  readonly breadcrumbCurrentLabel = input<string>('');
  readonly projectCountLabel = input<string>('');
  readonly loading = input<boolean>(false);
  readonly t = input.required<(key: string, fallback?: string) => string>();

  readonly newProject = output<void>();

  onNewProject(): void {
    this.newProject.emit();
  }
}
`);
writeFile('projects-page-header.component.html', headerTemplate);

const headerScss = between(
  scss,
  '      .projects-header {\n',
  '      .projects-loading {\n',
);
writeFile('projects-page-header.component.scss', `:host {\n  display: block;\n}\n\n.projects-header {\n${headerScss}`);

writeFile(
  'projects-table-view.component.ts',
`import { Component, input } from '@angular/core';
import type { ProjectColorKey, ProjectListItem } from '../../core/projects/projects.types';
import { UiRowShellDirective, UiRowShellSizeSmDirective, UiStatusBadgeDirective, UiStatusBadgeSizeSmDirective } from '../../shared/ui-primitives.directive';
import type { ProjectGroupedSection } from './projects-page.config';

@Component({
  selector: 'app-projects-table-view',
  standalone: true,
  imports: [UiRowShellDirective, UiRowShellSizeSmDirective, UiStatusBadgeDirective, UiStatusBadgeSizeSmDirective],
  templateUrl: './projects-table-view.component.html',
  styleUrl: './projects-table-view.component.scss',
})
export class ProjectsTableViewComponent {
  readonly section = input.required<ProjectGroupedSection>();
  readonly t = input.required<(key: string, fallback?: string) => string>();
  readonly tableAriaSort = input.required<(columnKey: string) => 'ascending' | 'descending' | 'none'>();
  readonly tableSortDirection = input.required<(columnKey: string) => 'asc' | 'desc' | null>();
  readonly colorTokenFor = input.required<(key: ProjectColorKey) => string>();
  readonly projectStatusLabel = input.required<(status: ProjectListItem['status']) => string>();
  readonly formatRelativeDate = input.required<(value: string | null) => string>();
}
`);
writeFile('projects-table-view.component.html', tableTemplate);

const tableScss = between(
  scss,
  '      .projects-list {\n',
  '      .projects-grid {\n',
);
writeFile('projects-table-view.component.scss', `:host {\n  display: block;\n}\n\n.projects-list {\n${tableScss}`);

writeFile(
  'projects-grid-view.component.ts',
`import { Component, input, output } from '@angular/core';
import type { ProjectColorKey, ProjectListItem } from '../../core/projects/projects.types';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import { UiButtonDangerDirective, UiButtonDirective, UiButtonSecondaryDirective, UiCardShellDirective, UiCardShellSizeMdDirective } from '../../shared/ui-primitives.directive';
import type { ProjectGroupedSection } from './projects-page.config';

@Component({
  selector: 'app-projects-grid-view',
  standalone: true,
  imports: [
    ProjectColorPickerComponent,
    UiButtonDirective,
    UiButtonSecondaryDirective,
    UiButtonDangerDirective,
    UiCardShellDirective,
    UiCardShellSizeMdDirective,
  ],
  templateUrl: './projects-grid-view.component.html',
  styleUrl: './projects-grid-view.component.scss',
})
export class ProjectsGridViewComponent {
  readonly section = input.required<ProjectGroupedSection>();
  readonly t = input.required<(key: string, fallback?: string) => string>();
  readonly colorTokenFor = input.required<(key: ProjectColorKey) => string>();
  readonly formatRelativeDate = input.required<(value: string | null) => string>();
  readonly coloringProjectId = input<string | null>(null);

  readonly toggleColorPicker = output<string>();
  readonly colorSelected = output<{ projectId: string; colorKey: ProjectColorKey }>();
  readonly dangerAction = output<{ projectId: string; action: 'archive' | 'restore' | 'delete' }>();

  onToggleColorPicker(projectId: string): void {
    this.toggleColorPicker.emit(projectId);
  }

  onColorSelected(projectId: string, colorKey: ProjectColorKey): void {
    this.colorSelected.emit({ projectId, colorKey });
  }

  onDangerAction(projectId: string, action: 'archive' | 'restore' | 'delete'): void {
    this.dangerAction.emit({ projectId, action });
  }
}
`);
writeFile('projects-grid-view.component.html', gridTemplate);

const gridScss = between(
  scss,
  '      .projects-grid {\n',
  '      .projects-confirm {\n',
);
writeFile('projects-grid-view.component.scss', `:host {\n  display: block;\n}\n\n.projects-grid {\n${gridScss}`);

writeFile(
  'projects-confirm-dialog.component.ts',
`import { Component, input, output } from '@angular/core';
import { UiButtonDangerDirective, UiButtonDirective, UiButtonPrimaryDirective, UiButtonSecondaryDirective } from '../../shared/ui-primitives.directive';

@Component({
  selector: 'app-projects-confirm-dialog',
  standalone: true,
  imports: [UiButtonDirective, UiButtonSecondaryDirective, UiButtonPrimaryDirective, UiButtonDangerDirective],
  templateUrl: './projects-confirm-dialog.component.html',
  styleUrl: './projects-confirm-dialog.component.scss',
})
export class ProjectsConfirmDialogComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly confirmLabel = input<string>('');
  readonly cancelLabel = input<string>('Cancel');
  readonly busy = input<boolean>(false);
  readonly danger = input<boolean>(false);

  readonly cancel = output<void>();
  readonly confirm = output<void>();

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }
}
`);

writeFile(
  'projects-confirm-dialog.component.html',
`@if (open()) {
  <section class="projects-confirm" role="dialog" aria-modal="true">
    <div class="projects-confirm__surface">
      <h2>{{ title() }}</h2>
      <p>{{ message() }}</p>
      <div class="projects-confirm__actions">
        <button
          uiButton
          uiButtonSecondary
          type="button"
          class="ui-button ui-button--secondary"
          [disabled]="busy()"
          (click)="onCancel()"
        >
          {{ cancelLabel() }}
        </button>
        <button
          uiButton
          type="button"
          class="ui-button"
          [class.ui-button--danger]="danger()"
          [attr.uiButtonDanger]="danger() ? '' : null"
          [class.ui-button--primary]="!danger()"
          [attr.uiButtonPrimary]="!danger() ? '' : null"
          [disabled]="busy()"
          (click)="onConfirm()"
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </div>
  </section>
}
`,
);

const confirmScss = between(
  scss,
  '      .projects-confirm {\n',
  '      @keyframes projects-loading-pulse {\n',
);
writeFile('projects-confirm-dialog.component.scss', `:host {\n  display: contents;\n}\n\n.projects-confirm {\n${confirmScss}`);

let nextHtml = html;
nextHtml = nextHtml.replace(
  /\s*<header class="projects-header">[\s\S]*?<\/header>\n\n/,
`        <app-projects-page-header
          [currentProjectId]="currentProjectId()"
          [breadcrumbCurrentLabel]="breadcrumbCurrentLabel()"
          [projectCountLabel]="projectCountLabel()"
          [loading]="loading()"
          [t]="t"
          (newProject)="onNewProject()"
        />

`,
);
nextHtml = nextHtml.replace(
  /\s*@if \(viewMode\(\) === 'list'\) \{[\s\S]*?\}\s*@else \{[\s\S]*?\}\n/,
`                @if (viewMode() === 'list') {
                  <app-projects-table-view
                    [section]="section"
                    [t]="t"
                    [tableAriaSort]="tableAriaSortFn"
                    [tableSortDirection]="tableSortDirectionFn"
                    [colorTokenFor]="colorTokenForFn"
                    [projectStatusLabel]="projectStatusLabelFn"
                    [formatRelativeDate]="formatRelativeDateFn"
                  />
                } @else {
                  <app-projects-grid-view
                    [section]="section"
                    [t]="t"
                    [colorTokenFor]="colorTokenForFn"
                    [formatRelativeDate]="formatRelativeDateFn"
                    [coloringProjectId]="coloringProjectId()"
                    (toggleColorPicker)="toggleColorPicker($event)"
                    (colorSelected)="onColorSelected($event.projectId, $event.colorKey)"
                    (dangerAction)="requestDangerAction($event.projectId, $event.action)"
                  />
                }
`,
);
nextHtml = nextHtml.replace(
  /\s*@if \(hasPendingAction\(\)\) \{[\s\S]*?\}\n\s*<\/section>\n\s*<\/main>/,
`
        <app-projects-confirm-dialog
          [open]="hasPendingAction()"
          [title]="pendingActionTitle()"
          [message]="pendingActionMessage()"
          [confirmLabel]="pendingActionConfirmLabel()"
          [cancelLabel]="t('common.cancel', 'Cancel')"
          [busy]="pendingActionBusy()"
          [danger]="pendingProjectAction() === 'delete'"
          (cancel)="cancelPendingAction()"
          (confirm)="confirmPendingAction()"
        />
      </section>
    </main>`
);
fs.writeFileSync(htmlPath, nextHtml, 'utf8');

let nextScss = scss;
nextScss = nextScss.replace(/\s*\.projects-header \{[\s\S]*?\.projects-loading \{/m, '\n      .projects-loading {');
nextScss = nextScss.replace(/\s*\.projects-list \{[\s\S]*?\.projects-grid \{/m, '\n      .projects-grid {');
nextScss = nextScss.replace(/\s*\.projects-grid \{[\s\S]*?\.projects-confirm \{/m, '\n      .projects-confirm {');
nextScss = nextScss.replace(/\s*\.projects-confirm \{[\s\S]*?@keyframes projects-loading-pulse/m, '\n      @keyframes projects-loading-pulse');
fs.writeFileSync(scssPath, nextScss, 'utf8');

console.log('Projects page split script completed.');
