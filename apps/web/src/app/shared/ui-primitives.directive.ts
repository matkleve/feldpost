import { Directive } from '@angular/core';

@Directive({ selector: '[uiContainer]', standalone: true, host: { class: 'ui-container' } })
export class UiContainerDirective {}

@Directive({
  selector: '[uiContainerCompact]',
  standalone: true,
  host: { class: 'ui-container--compact' },
})
export class UiContainerCompactDirective {}

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

@Directive({ selector: 'button[uiButton]', standalone: true, host: { class: 'ui-button' } })
export class UiButtonDirective {}

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
  selector: 'select[uiSelectControlCompact]',
  standalone: true,
  host: { class: 'ui-select-control--compact' },
})
export class UiSelectControlCompactDirective {}

@Directive({ selector: 'button[uiToggleRow]', standalone: true, host: { class: 'ui-toggle-row' } })
export class UiToggleRowDirective {}

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

export const UI_PRIMITIVE_DIRECTIVES = [
  UiContainerDirective,
  UiContainerCompactDirective,
  UiSectionCardDirective,
  UiItemDirective,
  UiItemMediaDirective,
  UiItemLabelDirective,
  UiSpacerDirective,
  UiButtonDirective,
  UiButtonPrimaryDirective,
  UiButtonSecondaryDirective,
  UiButtonGhostDirective,
  UiButtonDangerDirective,
  UiIconButtonGhostDirective,
  UiIconButtonGhostDangerDirective,
  UiFieldRowDirective,
  UiFieldRowStackedDirective,
  UiFieldLabelDirective,
  UiInputControlDirective,
  UiInputControlCompactDirective,
  UiSelectControlDirective,
  UiSelectControlCompactDirective,
  UiToggleRowDirective,
  UiToggleRowCompactDirective,
  UiToggleSwitchDirective,
  UiToggleSwitchCompactDirective,
  UiRangeControlDirective,
  UiChipDirective,
  UiChipActionDirective,
  UiChipPassiveDirective,
  UiChipSelectedDirective,
  UiChoiceRowDirective,
  UiChoiceControlDirective,
  UiInlineEditRowDirective,
  UiInlineEditActionsDirective,
] as const;
