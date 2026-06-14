import type { ElementRef } from '@angular/core';
import { Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import type {
  ProjectListItem,
  ProjectMediaListItem,
} from '../../../core/projects/projects.types';
import { PROJECT_NAME_MAX_LENGTH } from '../../../core/projects/projects.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { UploadShellUiService } from '../../upload/upload-shell/upload-shell-ui.service';
import {
  colorTokenFor,
  formatRelativeDate,
  projectStatusLabel,
} from '../page/projects-page.logic';
import { ProjectMediaSectionComponent } from '../media-section/project-media-section.component';
import { ChipComponent } from '../../../shared/components/chip/chip.component';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../shared/ui/input';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../shared/ui/toggle-group';
import { PaneToolbarComponent } from '../../../shared/pane-chrome/toolbar/pane-toolbar.component';
import {
  buildCardVariantToggleOptions,
  buildCompactCardVariantSwitchTitle,
  getNextCardVariantToggleOption,
} from '../../../shared/ui-primitives/card-variant-toggle.helpers';
import { CARD_VARIANTS, type CardVariant } from '../../../shared/ui-primitives/card-variant.types';
import { CardVariantSettingsService } from '../../../shared/ui-primitives/card-variant-settings.service';
import { toggleSingleStringValue } from '../../../shared/ui/toggle-group/toggle-group-option.helpers';
import type { ItemDisplayMode } from '../../../shared/item-grid/item.component';
import { MediaPickerDialogComponent } from '../../../shared/media-picker-dialog/media-picker-dialog.component';

@Component({
  selector: 'app-project-detail-view',
  standalone: true,
  imports: [
    ProjectMediaSectionComponent,
    ChipComponent,
    MediaPickerDialogComponent,
    PaneToolbarComponent,
    ...BrnToggleGroupImports,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
    ...HLM_TOGGLE_GROUP_IMPORTS,
  ],
  templateUrl: './project-detail-view.component.html',
  styleUrl: './project-detail-view.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ProjectDetailViewComponent {
  private readonly i18nService = inject(I18nService);
  private readonly workspaceView = inject(WorkspaceViewService);
  private readonly uploadShellUi = inject(UploadShellUiService, { optional: true });
  private readonly cardVariantSettings = inject(CardVariantSettingsService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  readonly project = input<ProjectListItem | null>(null);
  readonly namingNewProject = input(false);
  readonly detailsPanelOpen = input(false);
  readonly exclusiveMedia = input<ProjectMediaListItem[]>([]);
  readonly sharedMedia = input<ProjectMediaListItem[]>([]);
  readonly mediaLoading = input(false);

  readonly editingTitle = signal(false);
  readonly titleDraft = signal('');
  readonly pickerOpen = signal(false);
  readonly projectNameMaxLength = PROJECT_NAME_MAX_LENGTH;
  readonly cardVariant = signal<CardVariant>(this.cardVariantSettings.getVariant('projects'));
  readonly allowedCardVariants = CARD_VARIANTS;

  readonly cardVariantToggleOptions = computed(() =>
    buildCardVariantToggleOptions((k, f) => this.t(k, f), this.allowedCardVariants, true),
  );

  readonly currentCardVariantToggleOption = computed(() => {
    const options = this.cardVariantToggleOptions();
    if (options.length === 0) return null;
    const current = this.cardVariant();
    return options.find((opt) => opt.id === current) ?? options[0];
  });

  readonly nextCardVariantToggleOption = computed(() =>
    getNextCardVariantToggleOption(this.cardVariantToggleOptions(), this.cardVariant()),
  );

  readonly compactCardVariantToggleTitle = computed(() =>
    buildCompactCardVariantSwitchTitle((k, f) => this.t(k, f), this.nextCardVariantToggleOption()),
  );

  readonly itemDisplayMode = computed<ItemDisplayMode>(() => {
    switch (this.cardVariant()) {
      case 'row':
        return 'row';
      case 'small':
        return 'grid-sm';
      case 'medium':
        return 'grid-md';
      case 'large':
        return 'grid-lg';
      default:
        return 'grid-sm';
    }
  });

  readonly detailsToggled = output<void>();
  readonly titleRenamed = output<string>();
  readonly mediaAdded = output<string[]>();
  readonly mediaRemoved = output<string>();

  readonly assignedMediaIds = computed(() => [
    ...this.exclusiveMedia().map((item) => item.id),
    ...this.sharedMedia().map((item) => item.id),
  ]);

  constructor() {
    effect(() => {
      this.cardVariantSettings.setVariant('projects', this.cardVariant());
    });

    effect(() => {
      const project = this.project();
      if (!project) {
        return;
      }

      if (this.namingNewProject()) {
        this.titleDraft.set('');
        this.editingTitle.set(true);
        return;
      }

      this.editingTitle.set(false);
      this.titleDraft.set(project.name);
    });

    effect(() => {
      if (!this.editingTitle()) {
        return;
      }

      setTimeout(() => {
        const input = this.titleInput()?.nativeElement;
        if (!input) {
          return;
        }

        input.focus();
        input.select();
      }, 0);
    });
  }

  colorFor(key: ProjectListItem['colorKey']): string {
    return colorTokenFor(key);
  }

  statusLabel(status: ProjectListItem['status']): string {
    return projectStatusLabel(status, this.t);
  }

  statusChipVariant(status: ProjectListItem['status']): 'status-success' | 'neutral' {
    return status === 'archived' ? 'neutral' : 'status-success';
  }

  statusChipIcon(status: ProjectListItem['status']): string {
    return status === 'archived' ? 'inventory_2' : 'radio_button_checked';
  }

  relativeDate(value: string | null): string {
    return formatRelativeDate(value, this.t);
  }

  locationLabel(project: ProjectListItem): string {
    return project.city ?? project.district ?? this.t('projects.detail.location.unknown', 'No location');
  }

  startTitleEdit(): void {
    const project = this.project();
    if (!project) {
      return;
    }

    this.titleDraft.set(project.name);
    this.editingTitle.set(true);
  }

  onTitleDraftInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.titleDraft.set(target.value);
  }

  cancelTitleEdit(): void {
    if (this.namingNewProject()) {
      this.submitTitle();
      return;
    }

    this.editingTitle.set(false);
  }

  submitTitle(): void {
    if (!this.editingTitle()) {
      return;
    }

    this.editingTitle.set(false);
    this.titleRenamed.emit(this.titleDraft());
  }

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onCardVariantToggleChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value === 'row' || value === 'small' || value === 'medium' || value === 'large') {
      this.cardVariant.set(value);
    }
  }

  cycleCardVariant(): void {
    const next = this.nextCardVariantToggleOption();
    if (!next) return;
    const value = next.id;
    if (value === 'row' || value === 'small' || value === 'medium' || value === 'large') {
      this.cardVariant.set(value);
    }
  }

  onUploadMedia(): void {
    const projectId = this.project()?.id;
    if (!projectId || !this.uploadShellUi) {
      return;
    }

    this.workspaceView.setSelectedProjectIds(new Set([projectId]));
    this.uploadShellUi.openUploadPanel();
  }

  onPickerConfirmed(mediaIds: string[]): void {
    this.pickerOpen.set(false);
    if (mediaIds.length > 0) {
      this.mediaAdded.emit(mediaIds);
    }
  }

  onPickerCancelled(): void {
    this.pickerOpen.set(false);
  }
}
