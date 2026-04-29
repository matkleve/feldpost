import { Directive } from '@angular/core';

@Directive({ selector: '[uiContainer]', standalone: true, host: { class: 'ui-container' } })
export class UiContainerDirective {}

@Directive({
  selector: '[uiContainerSizeSm]',
  standalone: true,
  host: { class: 'ui-container--sm' },
})
export class UiContainerSizeSmDirective {}

@Directive({
  selector: '[uiContainerSizeMd]',
  standalone: true,
  host: { class: 'ui-container--md' },
})
export class UiContainerSizeMdDirective {}

@Directive({
  selector: '[uiContainerSizeLg]',
  standalone: true,
  host: { class: 'ui-container--lg' },
})
export class UiContainerSizeLgDirective {}

@Directive({ selector: '[uiSectionCard]', standalone: true, host: { class: 'ui-section-card' } })
export class UiSectionCardDirective {}

@Directive({ selector: '[uiItem]', standalone: true, host: { class: 'ui-item' } })
export class UiItemDirective {}

@Directive({ selector: '[uiItemMedia]', standalone: true, host: { class: 'ui-item-media' } })
export class UiItemMediaDirective {}

@Directive({ selector: '[uiItemLabel]', standalone: true, host: { class: 'ui-item-label' } })
export class UiItemLabelDirective {}

@Directive({ selector: '[uiSpacer]', standalone: true, host: { class: 'ui-spacer' } })
export class UiSpacerDirective {}

@Directive({
  selector: 'button[uiToolbarButton]',
  standalone: true,
  host: { class: 'toolbar-btn' },
})
export class UiToolbarButtonDirective {}

@Directive({ selector: 'button[uiButton]', standalone: true, host: { class: 'ui-button' } })
export class UiButtonDirective {}

@Directive({
  selector: 'button[uiButtonSizeSm]',
  standalone: true,
  host: { class: 'ui-button--sm' },
})
export class UiButtonSizeSmDirective {}

@Directive({
  selector: 'button[uiButtonSizeMd]',
  standalone: true,
  host: { class: 'ui-button--md' },
})
export class UiButtonSizeMdDirective {}

@Directive({
  selector: 'button[uiButtonSizeLg]',
  standalone: true,
  host: { class: 'ui-button--lg' },
})
export class UiButtonSizeLgDirective {}

@Directive({
  selector: 'button[uiButtonIconOnly]',
  standalone: true,
  host: { class: 'ui-button--icon-only' },
})
export class UiButtonIconOnlyDirective {}

@Directive({
  selector: 'button[uiButtonIconWithText]',
  standalone: true,
  host: { class: 'ui-button--icon-with-text' },
})
export class UiButtonIconWithTextDirective {}

@Directive({
  selector: 'button[uiButtonTextOnly]',
  standalone: true,
  host: { class: 'ui-button--text-only' },
})
export class UiButtonTextOnlyDirective {}

@Directive({
  selector: 'button[uiButtonLoading]',
  standalone: true,
  host: { class: 'ui-button--loading' },
})
export class UiButtonLoadingDirective {}

@Directive({
  selector: 'button[uiButtonPrimary]',
  standalone: true,
  host: { class: 'ui-button--primary' },
})
export class UiButtonPrimaryDirective {}

@Directive({
  selector: 'button[uiButtonSecondary]',
  standalone: true,
  host: { class: 'ui-button--secondary' },
})
export class UiButtonSecondaryDirective {}

@Directive({
  selector: 'button[uiButtonGhost]',
  standalone: true,
  host: { class: 'ui-button--ghost' },
})
export class UiButtonGhostDirective {}

@Directive({
  selector: 'button[uiButtonDanger]',
  standalone: true,
  host: { class: 'ui-button--danger' },
})
export class UiButtonDangerDirective {}

@Directive({
  selector: 'button[uiIconButtonGhost]',
  standalone: true,
  host: { class: 'icon-btn-ghost' },
})
export class UiIconButtonGhostDirective {}

@Directive({
  selector: 'button[uiIconButtonGhostSizeSm]',
  standalone: true,
  host: { class: 'icon-btn-ghost--sm' },
})
export class UiIconButtonGhostSizeSmDirective {}

@Directive({
  selector: 'button[uiIconButtonGhostSizeMd]',
  standalone: true,
  host: { class: 'icon-btn-ghost--md' },
})
export class UiIconButtonGhostSizeMdDirective {}

@Directive({
  selector: 'button[uiIconButtonGhostSizeLg]',
  standalone: true,
  host: { class: 'icon-btn-ghost--lg' },
})
export class UiIconButtonGhostSizeLgDirective {}

@Directive({
  selector: 'button[uiIconButtonGhostLoading]',
  standalone: true,
  host: { class: 'icon-btn-ghost--loading' },
})
export class UiIconButtonGhostLoadingDirective {}

@Directive({
  selector: 'button[uiIconButtonGhostDanger]',
  standalone: true,
  host: { class: 'icon-btn-ghost--danger' },
})
export class UiIconButtonGhostDangerDirective {}

@Directive({ selector: '[uiFieldRow]', standalone: true, host: { class: 'ui-field-row' } })
export class UiFieldRowDirective {}

@Directive({
  selector: '[uiFieldRowStacked]',
  standalone: true,
  host: { class: 'ui-field-row--stacked' },
})
export class UiFieldRowStackedDirective {}

@Directive({ selector: '[uiFieldLabel]', standalone: true, host: { class: 'ui-field-label' } })
export class UiFieldLabelDirective {}

@Directive({
  selector: 'input[uiInputControl], textarea[uiInputControl]',
  standalone: true,
  host: { class: 'ui-input-control' },
})
export class UiInputControlDirective {}

@Directive({
  selector: 'input[uiInputControlSizeSm], textarea[uiInputControlSizeSm]',
  standalone: true,
  host: { class: 'ui-input-control--sm' },
})
export class UiInputControlSizeSmDirective {}

@Directive({
  selector: 'input[uiInputControlSizeMd], textarea[uiInputControlSizeMd]',
  standalone: true,
  host: { class: 'ui-input-control--md' },
})
export class UiInputControlSizeMdDirective {}

@Directive({
  selector: 'input[uiInputControlSizeLg], textarea[uiInputControlSizeLg]',
  standalone: true,
  host: { class: 'ui-input-control--lg' },
})
export class UiInputControlSizeLgDirective {}

@Directive({
  selector: 'input[uiInputControlLoading], textarea[uiInputControlLoading]',
  standalone: true,
  host: { class: 'ui-input-control--loading' },
})
export class UiInputControlLoadingDirective {}

@Directive({
  selector: 'input[uiInputControlError], textarea[uiInputControlError]',
  standalone: true,
  host: { class: 'ui-input-control--error' },
})
export class UiInputControlErrorDirective {}

@Directive({
  selector: 'input[uiInputControlCompact], textarea[uiInputControlCompact]',
  standalone: true,
  host: { class: 'ui-input-control--compact' },
})
export class UiInputControlCompactDirective {}

@Directive({
  selector: 'select[uiSelectControl]',
  standalone: true,
  host: { class: 'ui-select-control' },
})
export class UiSelectControlDirective {}

@Directive({
  selector: 'select[uiSelectControlSizeSm]',
  standalone: true,
  host: { class: 'ui-select-control--sm' },
})
export class UiSelectControlSizeSmDirective {}

@Directive({
  selector: 'select[uiSelectControlSizeMd]',
  standalone: true,
  host: { class: 'ui-select-control--md' },
})
export class UiSelectControlSizeMdDirective {}

@Directive({
  selector: 'select[uiSelectControlSizeLg]',
  standalone: true,
  host: { class: 'ui-select-control--lg' },
})
export class UiSelectControlSizeLgDirective {}

@Directive({
  selector: 'select[uiSelectControlLoading]',
  standalone: true,
  host: { class: 'ui-select-control--loading' },
})
export class UiSelectControlLoadingDirective {}

@Directive({
  selector: 'select[uiSelectControlError]',
  standalone: true,
  host: { class: 'ui-select-control--error' },
})
export class UiSelectControlErrorDirective {}

@Directive({
  selector: 'select[uiSelectControlCompact]',
  standalone: true,
  host: { class: 'ui-select-control--compact' },
})
export class UiSelectControlCompactDirective {}

@Directive({ selector: 'button[uiToggleRow]', standalone: true, host: { class: 'ui-toggle-row' } })
export class UiToggleRowDirective {}

@Directive({ selector: '[uiTabList]', standalone: true, host: { class: 'ui-tab-list' } })
export class UiTabListDirective {}

@Directive({ selector: 'button[uiTab]', standalone: true, host: { class: 'ui-tab' } })
export class UiTabDirective {}

@Directive({ selector: 'button[uiTabSizeSm]', standalone: true, host: { class: 'ui-tab--sm' } })
export class UiTabSizeSmDirective {}

@Directive({ selector: 'button[uiTabSizeMd]', standalone: true, host: { class: 'ui-tab--md' } })
export class UiTabSizeMdDirective {}

@Directive({ selector: 'button[uiTabSizeLg]', standalone: true, host: { class: 'ui-tab--lg' } })
export class UiTabSizeLgDirective {}

@Directive({
  selector: 'button[uiToggleRowSizeSm]',
  standalone: true,
  host: { class: 'ui-toggle-row--sm' },
})
export class UiToggleRowSizeSmDirective {}

@Directive({
  selector: 'button[uiToggleRowSizeMd]',
  standalone: true,
  host: { class: 'ui-toggle-row--md' },
})
export class UiToggleRowSizeMdDirective {}

@Directive({
  selector: 'button[uiToggleRowSizeLg]',
  standalone: true,
  host: { class: 'ui-toggle-row--lg' },
})
export class UiToggleRowSizeLgDirective {}

@Directive({
  selector: 'button[uiToggleRowLoading]',
  standalone: true,
  host: { class: 'ui-toggle-row--loading' },
})
export class UiToggleRowLoadingDirective {}

@Directive({
  selector: 'button[uiToggleRowError]',
  standalone: true,
  host: { class: 'ui-toggle-row--error' },
})
export class UiToggleRowErrorDirective {}

@Directive({
  selector: 'button[uiToggleRowCompact]',
  standalone: true,
  host: { class: 'ui-toggle-row--compact' },
})
export class UiToggleRowCompactDirective {}

@Directive({
  selector: 'span[uiToggleSwitch]',
  standalone: true,
  host: { class: 'ui-toggle-switch' },
})
export class UiToggleSwitchDirective {}

@Directive({
  selector: 'span[uiToggleSwitchSizeLg]',
  standalone: true,
  host: { class: 'ui-toggle-switch--lg' },
})
export class UiToggleSwitchSizeLgDirective {}

@Directive({
  selector: 'span[uiToggleSwitchCompact]',
  standalone: true,
  host: { class: 'ui-toggle-switch--compact' },
})
export class UiToggleSwitchCompactDirective {}

@Directive({
  selector: 'input[type="range"][uiRangeControl]',
  standalone: true,
  host: { class: 'ui-range-control' },
})
export class UiRangeControlDirective {}

@Directive({ selector: '[uiChip]', standalone: true, host: { class: 'ui-chip' } })
export class UiChipDirective {}

@Directive({ selector: '[uiChipSizeSm]', standalone: true, host: { class: 'ui-chip--sm' } })
export class UiChipSizeSmDirective {}

@Directive({ selector: '[uiChipSizeMd]', standalone: true, host: { class: 'ui-chip--md' } })
export class UiChipSizeMdDirective {}

@Directive({ selector: '[uiChipSizeLg]', standalone: true, host: { class: 'ui-chip--lg' } })
export class UiChipSizeLgDirective {}

@Directive({ selector: '[uiChipLoading]', standalone: true, host: { class: 'ui-chip--loading' } })
export class UiChipLoadingDirective {}

@Directive({ selector: '[uiChipError]', standalone: true, host: { class: 'ui-chip--error' } })
export class UiChipErrorDirective {}

@Directive({ selector: '[uiChipDisabled]', standalone: true, host: { class: 'ui-chip--disabled' } })
export class UiChipDisabledDirective {}

@Directive({
  selector: '[uiStatusBadge], [uiStatusPill]',
  standalone: true,
  host: { class: 'ui-status-badge' },
})
export class UiStatusBadgeDirective {}

@Directive({
  selector: '[uiStatusBadgeSizeSm], [uiStatusPillSizeSm]',
  standalone: true,
  host: { class: 'ui-status-badge--sm' },
})
export class UiStatusBadgeSizeSmDirective {}

@Directive({
  selector: '[uiStatusBadgeSizeMd], [uiStatusPillSizeMd]',
  standalone: true,
  host: { class: 'ui-status-badge--md' },
})
export class UiStatusBadgeSizeMdDirective {}

@Directive({
  selector: '[uiStatusBadgeNeutral], [uiStatusPillNeutral]',
  standalone: true,
  host: { class: 'ui-status-badge--neutral' },
})
export class UiStatusBadgeNeutralDirective {}

@Directive({
  selector: '[uiStatusBadgeInfo], [uiStatusPillInfo]',
  standalone: true,
  host: { class: 'ui-status-badge--info' },
})
export class UiStatusBadgeInfoDirective {}

@Directive({
  selector: '[uiStatusBadgeSuccess], [uiStatusPillSuccess]',
  standalone: true,
  host: { class: 'ui-status-badge--success' },
})
export class UiStatusBadgeSuccessDirective {}

@Directive({
  selector: '[uiStatusBadgeWarning], [uiStatusPillWarning]',
  standalone: true,
  host: { class: 'ui-status-badge--warning' },
})
export class UiStatusBadgeWarningDirective {}

@Directive({
  selector: '[uiStatusBadgeError], [uiStatusPillError]',
  standalone: true,
  host: { class: 'ui-status-badge--error' },
})
export class UiStatusBadgeErrorDirective {}

@Directive({ selector: '[uiChipAction]', standalone: true, host: { class: 'ui-chip--action' } })
export class UiChipActionDirective {}

@Directive({ selector: '[uiChipPassive]', standalone: true, host: { class: 'ui-chip--passive' } })
export class UiChipPassiveDirective {}

@Directive({ selector: '[uiChipSelected]', standalone: true, host: { class: 'ui-chip--selected' } })
export class UiChipSelectedDirective {}

@Directive({ selector: 'label[uiChoiceRow]', standalone: true, host: { class: 'ui-choice-row' } })
export class UiChoiceRowDirective {}

@Directive({
  selector: 'input[type="checkbox"][uiChoiceControl], input[type="radio"][uiChoiceControl]',
  standalone: true,
  host: { class: 'ui-choice-control' },
})
export class UiChoiceControlDirective {}

@Directive({
  selector: '[uiInlineEditRow]',
  standalone: true,
  host: { class: 'ui-inline-edit-row' },
})
export class UiInlineEditRowDirective {}

@Directive({
  selector: '[uiInlineEditActions]',
  standalone: true,
  host: { class: 'ui-inline-edit-actions' },
})
export class UiInlineEditActionsDirective {}

@Directive({ selector: '[uiRowShell]', standalone: true, host: { class: 'ui-row-shell' } })
export class UiRowShellDirective {}

@Directive({
  selector: '[uiRowShellSizeSm]',
  standalone: true,
  host: { class: 'ui-row-shell--sm' },
})
export class UiRowShellSizeSmDirective {}

@Directive({
  selector: '[uiRowShellSizeMd]',
  standalone: true,
  host: { class: 'ui-row-shell--md' },
})
export class UiRowShellSizeMdDirective {}

@Directive({
  selector: '[uiRowShellSizeLg]',
  standalone: true,
  host: { class: 'ui-row-shell--lg' },
})
export class UiRowShellSizeLgDirective {}

@Directive({ selector: '[uiCardShell]', standalone: true, host: { class: 'ui-card-shell' } })
export class UiCardShellDirective {}

@Directive({
  selector: '[uiCardShellSizeSm]',
  standalone: true,
  host: { class: 'ui-card-shell--sm' },
})
export class UiCardShellSizeSmDirective {}

@Directive({
  selector: '[uiCardShellSizeMd]',
  standalone: true,
  host: { class: 'ui-card-shell--md' },
})
export class UiCardShellSizeMdDirective {}

@Directive({
  selector: '[uiCardShellSizeLg]',
  standalone: true,
  host: { class: 'ui-card-shell--lg' },
})
export class UiCardShellSizeLgDirective {}

export const UI_PRIMITIVE_DIRECTIVES = [
  UiContainerDirective,
  UiContainerSizeSmDirective,
  UiContainerSizeMdDirective,
  UiContainerSizeLgDirective,
  UiSectionCardDirective,
  UiItemDirective,
  UiItemMediaDirective,
  UiItemLabelDirective,
  UiSpacerDirective,
  UiToolbarButtonDirective,
  UiButtonDirective,
  UiButtonSizeSmDirective,
  UiButtonSizeMdDirective,
  UiButtonSizeLgDirective,
  UiButtonIconOnlyDirective,
  UiButtonIconWithTextDirective,
  UiButtonTextOnlyDirective,
  UiButtonLoadingDirective,
  UiButtonPrimaryDirective,
  UiButtonSecondaryDirective,
  UiButtonGhostDirective,
  UiButtonDangerDirective,
  UiIconButtonGhostDirective,
  UiIconButtonGhostSizeSmDirective,
  UiIconButtonGhostSizeMdDirective,
  UiIconButtonGhostSizeLgDirective,
  UiIconButtonGhostLoadingDirective,
  UiIconButtonGhostDangerDirective,
  UiFieldRowDirective,
  UiFieldRowStackedDirective,
  UiFieldLabelDirective,
  UiInputControlDirective,
  UiInputControlSizeSmDirective,
  UiInputControlSizeMdDirective,
  UiInputControlSizeLgDirective,
  UiInputControlLoadingDirective,
  UiInputControlErrorDirective,
  UiInputControlCompactDirective,
  UiSelectControlDirective,
  UiSelectControlSizeSmDirective,
  UiSelectControlSizeMdDirective,
  UiSelectControlSizeLgDirective,
  UiSelectControlLoadingDirective,
  UiSelectControlErrorDirective,
  UiSelectControlCompactDirective,
  UiTabListDirective,
  UiTabDirective,
  UiTabSizeSmDirective,
  UiTabSizeMdDirective,
  UiTabSizeLgDirective,
  UiToggleRowDirective,
  UiToggleRowSizeSmDirective,
  UiToggleRowSizeMdDirective,
  UiToggleRowSizeLgDirective,
  UiToggleRowLoadingDirective,
  UiToggleRowErrorDirective,
  UiToggleRowCompactDirective,
  UiToggleSwitchDirective,
  UiToggleSwitchSizeLgDirective,
  UiToggleSwitchCompactDirective,
  UiRangeControlDirective,
  UiChipDirective,
  UiChipSizeSmDirective,
  UiChipSizeMdDirective,
  UiChipSizeLgDirective,
  UiChipLoadingDirective,
  UiChipErrorDirective,
  UiChipDisabledDirective,
  UiStatusBadgeDirective,
  UiStatusBadgeSizeSmDirective,
  UiStatusBadgeSizeMdDirective,
  UiStatusBadgeNeutralDirective,
  UiStatusBadgeInfoDirective,
  UiStatusBadgeSuccessDirective,
  UiStatusBadgeWarningDirective,
  UiStatusBadgeErrorDirective,
  UiChipActionDirective,
  UiChipPassiveDirective,
  UiChipSelectedDirective,
  UiChoiceRowDirective,
  UiChoiceControlDirective,
  UiInlineEditRowDirective,
  UiInlineEditActionsDirective,
  UiRowShellDirective,
  UiRowShellSizeSmDirective,
  UiRowShellSizeMdDirective,
  UiRowShellSizeLgDirective,
  UiCardShellDirective,
  UiCardShellSizeSmDirective,
  UiCardShellSizeMdDirective,
  UiCardShellSizeLgDirective,
] as const;

