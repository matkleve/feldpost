import { afterEveryRender, computed, Directive, ElementRef, inject, signal } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { badgeVariants, type BadgeVariants } from '../ui/badge/badge-variants';
import { buttonVariants, type ButtonVariants } from '../ui/button/button-variants';
import { inputVariants } from '../ui/input/input-variants';
import { labelVariants } from '../ui/label/label-variants';
import { selectVariants, type SelectVariants } from '../ui/select/select-variants';
import { switchLegacyShimTrackVariants, toggleRowVariants, type ToggleRowVariants } from '../ui/switch/switch-variants';

function computeUiButtonShimClasses(el: HTMLElement): string {
  const loading = el.hasAttribute('uibuttonloading');
  return twMerge(
    buttonVariants({ variant: resolveUiButtonVariant(el), size: resolveUiButtonSize(el) }),
    loading ? 'ui-button--loading' : '',
  );
}

function resolveUiButtonVariant(el: HTMLElement): NonNullable<ButtonVariants['variant']> {
  if (el.hasAttribute('uibuttondanger')) return 'destructive';
  if (el.hasAttribute('uibuttonprimary')) return 'default';
  if (el.hasAttribute('uibuttonghost')) return 'ghost';
  if (el.hasAttribute('uibuttonsecondary')) return 'outline';
  return 'outline';
}

function resolveUiButtonSize(el: HTMLElement): NonNullable<ButtonVariants['size']> {
  if (el.hasAttribute('uibuttonicononly')) return 'icon';
  if (el.hasAttribute('uibuttonsizesm')) return 'sm';
  if (el.hasAttribute('uibuttonsizelg')) return 'lg';
  return 'default';
}

function computeUiInputControlShimClasses(el: HTMLElement): string {
  const error = el.hasAttribute('uiinputcontrolerror');
  const base = inputVariants({ error });

  const legacy: string[] = [];
  // Legacy class kept for SCSS state hook — TODO: migrate to data-state after hlm swap
  if (el.hasAttribute('uiinputcontrolloading')) legacy.push('ui-input-control--loading');
  if (el.hasAttribute('uiinputcontrolcompact')) legacy.push('ui-input-control--compact');
  if (el.hasAttribute('uiinputcontrolsizesm')) legacy.push('ui-input-control--sm');
  else if (el.hasAttribute('uiinputcontrolsizemd')) legacy.push('ui-input-control--md');
  else if (el.hasAttribute('uiinputcontrolsizelg')) legacy.push('ui-input-control--lg');

  return twMerge(base, ...legacy);
}

function resolveUiSelectControlSize(el: HTMLElement): NonNullable<SelectVariants['size']> {
  if (el.hasAttribute('uiselectcontrolsizesm')) return 'sm';
  if (el.hasAttribute('uiselectcontrolsizemd')) return 'md';
  if (el.hasAttribute('uiselectcontrolsizelg')) return 'lg';
  if (el.hasAttribute('uiselectcontrolcompact')) return 'sm';
  return 'md';
}

function computeUiSelectControlShimClasses(el: HTMLElement): string {
  const error = el.hasAttribute('uiselectcontrolerror');
  const size = resolveUiSelectControlSize(el);
  const base = selectVariants({ size, error });

  const legacy: string[] = ['ui-select-control'];
  if (el.hasAttribute('uiselectcontrolerror')) legacy.push('ui-select-control--error');
  if (el.hasAttribute('uiselectcontrolloading')) legacy.push('ui-select-control--loading');
  if (el.hasAttribute('uiselectcontrolcompact')) legacy.push('ui-select-control--compact');
  if (el.hasAttribute('uiselectcontrolsizesm')) legacy.push('ui-select-control--sm');
  else if (el.hasAttribute('uiselectcontrolsizemd')) legacy.push('ui-select-control--md');
  else if (el.hasAttribute('uiselectcontrolsizelg')) legacy.push('ui-select-control--lg');

  return twMerge(base, ...legacy);
}

function computeUiToggleSwitchShimClasses(el: HTMLElement): string {
  const legacy = new Set<string>(['ui-toggle-switch']);
  for (const c of el.classList) {
    if (c.startsWith('ui-toggle-switch')) legacy.add(c);
  }
  if (el.hasAttribute('uitoggleswitchcompact')) legacy.add('ui-toggle-switch--compact');
  if (el.hasAttribute('uitoggleswitchsizelg')) legacy.add('ui-toggle-switch--lg');
  const checked = legacy.has('ui-toggle-switch--on');
  return twMerge(
    switchLegacyShimTrackVariants(),
    checked ? 'bg-primary' : 'bg-input',
    ...legacy,
  );
}

function resolveToggleRowTone(el: HTMLElement): NonNullable<ToggleRowVariants['tone']> {
  if (el.hasAttribute('uitogglerowloading')) return 'loading';
  if (el.hasAttribute('uitogglerowerror')) return 'error';
  return 'default';
}

function computeUiToggleRowShimClasses(el: HTMLElement): string {
  const legacy = new Set<string>(['ui-toggle-row']);
  for (const c of el.classList) {
    if (c.startsWith('ui-toggle-row')) legacy.add(c);
  }
  if (el.hasAttribute('uitogglerowsizesm')) legacy.add('ui-toggle-row--sm');
  else if (el.hasAttribute('uitogglerowsizemd')) legacy.add('ui-toggle-row--md');
  else if (el.hasAttribute('uitogglerowsizelg')) legacy.add('ui-toggle-row--lg');
  if (el.hasAttribute('uitogglerowcompact')) legacy.add('ui-toggle-row--compact');
  if (el.hasAttribute('uitogglerowloading')) legacy.add('ui-toggle-row--loading');
  if (el.hasAttribute('uitogglerowerror')) legacy.add('ui-toggle-row--error');
  const tone = resolveToggleRowTone(el);
  return twMerge(toggleRowVariants({ tone }), ...legacy);
}

function computeUiChipShimClasses(el: HTMLElement): string {
  const legacy = new Set<string>(['ui-chip']);
  for (const c of el.classList) {
    if (c.startsWith('ui-chip')) legacy.add(c);
  }
  if (el.hasAttribute('uichipsizesm')) legacy.add('ui-chip--sm');
  else if (el.hasAttribute('uichipsizemd')) legacy.add('ui-chip--md');
  else if (el.hasAttribute('uichipsizelg')) legacy.add('ui-chip--lg');
  if (el.hasAttribute('uichiploading')) legacy.add('ui-chip--loading');
  if (el.hasAttribute('uichiperror')) legacy.add('ui-chip--error');
  if (el.hasAttribute('uichipdisabled')) legacy.add('ui-chip--disabled');
  if (el.hasAttribute('uichipaction')) legacy.add('ui-chip--action');
  if (el.hasAttribute('uichippassive')) legacy.add('ui-chip--passive');
  if (el.hasAttribute('uichipselected')) legacy.add('ui-chip--selected');
  return twMerge(badgeVariants({ variant: 'outline' }), ...legacy);
}

function resolveUiStatusBadgeVariant(el: HTMLElement): NonNullable<BadgeVariants['variant']> {
  if (
    el.hasAttribute('uistatusbadgeerror') ||
    el.hasAttribute('uistatuspillerror') ||
    el.classList.contains('ui-status-badge--error')
  ) {
    return 'destructive';
  }
  if (
    el.hasAttribute('uistatusbadgewarning') ||
    el.hasAttribute('uistatuspillwarning') ||
    el.classList.contains('ui-status-badge--warning')
  ) {
    return 'warning';
  }
  if (
    el.hasAttribute('uistatusbadgesuccess') ||
    el.hasAttribute('uistatuspillsuccess') ||
    el.classList.contains('ui-status-badge--success')
  ) {
    return 'success';
  }
  if (el.hasAttribute('uistatusbadgeinfo') || el.hasAttribute('uistatuspillinfo')) {
    return 'info';
  }
  if (el.hasAttribute('uistatusbadgeneutral') || el.hasAttribute('uistatuspillneutral')) {
    return 'neutral';
  }
  return 'muted';
}

function computeUiStatusBadgeShimClasses(el: HTMLElement): string {
  const legacy = new Set<string>(['ui-status-badge']);
  for (const c of el.classList) {
    if (c.startsWith('ui-status-badge') || c.startsWith('ui-status-pill')) legacy.add(c);
  }
  applyUiStatusBadgeMarkerClasses(el, legacy);
  const variant = resolveUiStatusBadgeVariant(el);
  return twMerge(badgeVariants({ variant }), ...legacy);
}

/** Pushes legacy BEM hooks from marker attributes into `legacy` (deduped). */
function applyUiStatusBadgeMarkerClasses(el: HTMLElement, legacy: Set<string>): void {
  if (hasAnyAttribute(el, 'uistatusbadgesizesm', 'uistatuspillsizesm')) legacy.add('ui-status-badge--sm');
  else if (hasAnyAttribute(el, 'uistatusbadgesizemd', 'uistatuspillsizemd')) legacy.add('ui-status-badge--md');
  if (hasAnyAttribute(el, 'uistatusbadgeneutral', 'uistatuspillneutral')) legacy.add('ui-status-badge--neutral');
  if (hasAnyAttribute(el, 'uistatusbadgeinfo', 'uistatuspillinfo')) legacy.add('ui-status-badge--info');
  if (hasAnyAttribute(el, 'uistatusbadgesuccess', 'uistatuspillsuccess')) legacy.add('ui-status-badge--success');
  if (hasAnyAttribute(el, 'uistatusbadgewarning', 'uistatuspillwarning')) legacy.add('ui-status-badge--warning');
  if (hasAnyAttribute(el, 'uistatusbadgeerror', 'uistatuspillerror')) legacy.add('ui-status-badge--error');
}

function hasAnyAttribute(el: HTMLElement, ...attrs: string[]): boolean {
  return attrs.some((a) => el.hasAttribute(a));
}

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

/**
 * Maps legacy `uiButton*` attributes to `buttonVariants` (tweakcn / shadcn tokens); keeps `.ui-button--loading` for SCSS spinner.
 * @see docs/MIGRATION_PLAN.md
 */
// Shim: delegates to hlmButton CVA until all callsites are migrated.
// TODO(spartan-v4): After callsite migration, remove this shim and use HlmButtonDirective directly.
// @see apps/web/src/app/shared/ui/button/hlm-button.directive.ts
@Directive({
  selector: 'button[uiButton]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiButtonDirective {
  private readonly _el = inject(ElementRef<HTMLElement>);
  protected readonly hostClass = signal('');

  constructor() {
    afterEveryRender(() => {
      this.hostClass.set(computeUiButtonShimClasses(this._el.nativeElement));
    });
  }
}

/** Marker directives only — classes come from {@link UiButtonDirective}. */
@Directive({ selector: 'button[uiButtonSizeSm]', standalone: true })
export class UiButtonSizeSmDirective {}

@Directive({ selector: 'button[uiButtonSizeMd]', standalone: true })
export class UiButtonSizeMdDirective {}

@Directive({ selector: 'button[uiButtonSizeLg]', standalone: true })
export class UiButtonSizeLgDirective {}

@Directive({ selector: 'button[uiButtonIconOnly]', standalone: true })
export class UiButtonIconOnlyDirective {}

@Directive({ selector: 'button[uiButtonIconWithText]', standalone: true })
export class UiButtonIconWithTextDirective {}

@Directive({ selector: 'button[uiButtonTextOnly]', standalone: true })
export class UiButtonTextOnlyDirective {}

@Directive({ selector: 'button[uiButtonLoading]', standalone: true })
export class UiButtonLoadingDirective {}

@Directive({ selector: 'button[uiButtonPrimary]', standalone: true })
export class UiButtonPrimaryDirective {}

@Directive({ selector: 'button[uiButtonSecondary]', standalone: true })
export class UiButtonSecondaryDirective {}

@Directive({ selector: 'button[uiButtonGhost]', standalone: true })
export class UiButtonGhostDirective {}

@Directive({ selector: 'button[uiButtonDanger]', standalone: true })
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

// Shim: Tailwind stack must match `twMerge(formFieldVariants(), 'ui-field-row')` (string literal required for `host.class` AOT).
// TODO(spartan-v4): After callsite migration, remove this shim or use `hlm-form-field` only.
// @see apps/web/src/app/shared/ui/form-field/form-field-variants.ts
@Directive({
  selector: '[uiFieldRow]',
  standalone: true,
  host: { class: 'flex flex-col gap-1.5 ui-field-row' },
})
export class UiFieldRowDirective {}

@Directive({
  selector: '[uiFieldRowStacked]',
  standalone: true,
  host: { class: 'ui-field-row--stacked' },
})
export class UiFieldRowStackedDirective {}

// Shim: delegates to hlmLabel CVA until all callsites are migrated.
// TODO(spartan-v4): After callsite migration, remove this shim and use HlmLabelDirective directly.
// @see apps/web/src/app/shared/ui/label/hlm-label.directive.ts
@Directive({
  selector: '[uiFieldLabel]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiFieldLabelDirective {
  // Legacy class kept for SCSS state hook — TODO: migrate to data-state after hlm swap
  protected readonly hostClass = computed(() => twMerge(labelVariants(), 'ui-field-label'));
}

// Shim: delegates to hlmInput CVA until all callsites are migrated.
// TODO(spartan-v4): After callsite migration, remove this shim and use HlmInputDirective directly.
// @see apps/web/src/app/shared/ui/input/hlm-input.directive.ts
@Directive({
  selector: 'input[uiInputControl], textarea[uiInputControl]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiInputControlDirective {
  private readonly _el = inject(ElementRef<HTMLElement>);
  protected readonly hostClass = signal('');

  constructor() {
    afterEveryRender(() => {
      this.hostClass.set(computeUiInputControlShimClasses(this._el.nativeElement));
    });
  }
}

/** Marker — merged into {@link UiInputControlDirective} host classes. */
@Directive({
  selector: 'input[uiInputControlSizeSm], textarea[uiInputControlSizeSm]',
  standalone: true,
})
export class UiInputControlSizeSmDirective {}

/** Marker — merged into {@link UiInputControlDirective} host classes. */
@Directive({
  selector: 'input[uiInputControlSizeMd], textarea[uiInputControlSizeMd]',
  standalone: true,
})
export class UiInputControlSizeMdDirective {}

/** Marker — merged into {@link UiInputControlDirective} host classes. */
@Directive({
  selector: 'input[uiInputControlSizeLg], textarea[uiInputControlSizeLg]',
  standalone: true,
})
export class UiInputControlSizeLgDirective {}

/** Marker — merged into {@link UiInputControlDirective} host classes. */
@Directive({
  selector: 'input[uiInputControlLoading], textarea[uiInputControlLoading]',
  standalone: true,
})
export class UiInputControlLoadingDirective {}

/** Marker — merged into {@link UiInputControlDirective} host classes. */
@Directive({
  selector: 'input[uiInputControlError], textarea[uiInputControlError]',
  standalone: true,
})
export class UiInputControlErrorDirective {}

/** Marker — merged into {@link UiInputControlDirective} host classes. */
@Directive({
  selector: 'input[uiInputControlCompact], textarea[uiInputControlCompact]',
  standalone: true,
})
export class UiInputControlCompactDirective {}

// Shim: delegates to hlmSelect CVA until all callsites are migrated.
// TODO(spartan-v4): After callsite migration, replace with HlmSelectDirective.
// When spartan ships v4-compatible ui-select-helm, swap the local CVA.
// @see apps/web/src/app/shared/ui/select/
@Directive({
  selector: 'select[uiSelectControl]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiSelectControlDirective {
  private readonly _el = inject(ElementRef<HTMLElement>);
  protected readonly hostClass = signal('');

  constructor() {
    afterEveryRender(() => {
      this.hostClass.set(computeUiSelectControlShimClasses(this._el.nativeElement));
    });
  }
}

/** Marker — merged into {@link UiSelectControlDirective} host classes. */
@Directive({
  selector: 'select[uiSelectControlSizeSm]',
  standalone: true,
})
export class UiSelectControlSizeSmDirective {}

/** Marker — merged into {@link UiSelectControlDirective} host classes. */
@Directive({
  selector: 'select[uiSelectControlSizeMd]',
  standalone: true,
})
export class UiSelectControlSizeMdDirective {}

/** Marker — merged into {@link UiSelectControlDirective} host classes. */
@Directive({
  selector: 'select[uiSelectControlSizeLg]',
  standalone: true,
})
export class UiSelectControlSizeLgDirective {}

/** Marker — merged into {@link UiSelectControlDirective} host classes. */
@Directive({
  selector: 'select[uiSelectControlLoading]',
  standalone: true,
})
export class UiSelectControlLoadingDirective {}

/** Marker — merged into {@link UiSelectControlDirective} host classes. */
@Directive({
  selector: 'select[uiSelectControlError]',
  standalone: true,
})
export class UiSelectControlErrorDirective {}

/** Marker — merged into {@link UiSelectControlDirective} host classes. */
@Directive({
  selector: 'select[uiSelectControlCompact]',
  standalone: true,
})
export class UiSelectControlCompactDirective {}

// Shim: merges `toggleRowVariants` + keeps `.ui-toggle-row*` SCSS hooks until `BrnSwitch` / row migration.
// TODO(spartan-v4): After callsite migration, replace with `HlmSwitch` + brain switch or drop shim.
// @see apps/web/src/app/shared/ui/switch/
@Directive({
  selector: 'button[uiToggleRow]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiToggleRowDirective {
  private readonly _el = inject(ElementRef<HTMLElement>);
  protected readonly hostClass = signal('');

  constructor() {
    afterEveryRender(() => {
      this.hostClass.set(computeUiToggleRowShimClasses(this._el.nativeElement));
    });
  }
}

/** Marker — merged into {@link UiToggleRowDirective} host classes. */
@Directive({
  selector: 'button[uiToggleRowSizeSm]',
  standalone: true,
})
export class UiToggleRowSizeSmDirective {}

/** Marker — merged into {@link UiToggleRowDirective} host classes. */
@Directive({
  selector: 'button[uiToggleRowSizeMd]',
  standalone: true,
})
export class UiToggleRowSizeMdDirective {}

/** Marker — merged into {@link UiToggleRowDirective} host classes. */
@Directive({
  selector: 'button[uiToggleRowSizeLg]',
  standalone: true,
})
export class UiToggleRowSizeLgDirective {}

/** Marker — merged into {@link UiToggleRowDirective} host classes. */
@Directive({
  selector: 'button[uiToggleRowLoading]',
  standalone: true,
})
export class UiToggleRowLoadingDirective {}

/** Marker — merged into {@link UiToggleRowDirective} host classes. */
@Directive({
  selector: 'button[uiToggleRowError]',
  standalone: true,
})
export class UiToggleRowErrorDirective {}

/** Marker — merged into {@link UiToggleRowDirective} host classes. */
@Directive({
  selector: 'button[uiToggleRowCompact]',
  standalone: true,
})
export class UiToggleRowCompactDirective {}

// Shim: merges `switchLegacyShimTrackVariants` + token checked bg; keeps `.ui-toggle-switch*` SCSS hooks (pseudo-thumb).
// TODO(spartan-v4): After callsite migration, use `HLM_SWITCH_IMPORTS` + `BrnSwitch` when brain ships switch; drop shim.
// @see apps/web/src/app/shared/ui/switch/
@Directive({
  selector: 'span[uiToggleSwitch]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiToggleSwitchDirective {
  private readonly _el = inject(ElementRef<HTMLElement>);
  protected readonly hostClass = signal('');

  constructor() {
    afterEveryRender(() => {
      this.hostClass.set(computeUiToggleSwitchShimClasses(this._el.nativeElement));
    });
  }
}

/** Marker — merged into {@link UiToggleSwitchDirective} host classes. */
@Directive({
  selector: 'span[uiToggleSwitchSizeLg]',
  standalone: true,
})
export class UiToggleSwitchSizeLgDirective {}

/** Marker — merged into {@link UiToggleSwitchDirective} host classes. */
@Directive({
  selector: 'span[uiToggleSwitchCompact]',
  standalone: true,
})
export class UiToggleSwitchCompactDirective {}

// Shim: merges `badgeVariants({ variant: 'outline' })` + keeps `.ui-chip*` SCSS hooks.
// TODO(spartan-v4): After callsite migration, use `hlmBadge` / `HlmBadgeDirective`; retire primitive sheet when `app-chip` file-type tokens are reconciled (see `chip.component.ts` variants).
// @see apps/web/src/app/shared/ui/badge/
@Directive({
  selector: '[uiChip]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiChipDirective {
  private readonly _el = inject(ElementRef<HTMLElement>);
  protected readonly hostClass = signal('');

  constructor() {
    afterEveryRender(() => {
      this.hostClass.set(computeUiChipShimClasses(this._el.nativeElement));
    });
  }
}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({
  selector: '[uiChipSizeSm]',
  standalone: true,
})
export class UiChipSizeSmDirective {}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({
  selector: '[uiChipSizeMd]',
  standalone: true,
})
export class UiChipSizeMdDirective {}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({
  selector: '[uiChipSizeLg]',
  standalone: true,
})
export class UiChipSizeLgDirective {}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({
  selector: '[uiChipLoading]',
  standalone: true,
})
export class UiChipLoadingDirective {}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({
  selector: '[uiChipError]',
  standalone: true,
})
export class UiChipErrorDirective {}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({
  selector: '[uiChipDisabled]',
  standalone: true,
})
export class UiChipDisabledDirective {}

// Shim: merges `badgeVariants` semantic surface + keeps `.ui-status-badge*` SCSS hooks (`uiStatusPill*` shares the same BEM tree).
// TODO(spartan-v4): After callsite migration, use `[hlmBadge]` with explicit `variant` inputs; drop duplicate SCSS.
// @see apps/web/src/app/shared/ui/badge/
@Directive({
  selector: '[uiStatusBadge], [uiStatusPill]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiStatusBadgeDirective {
  private readonly _el = inject(ElementRef<HTMLElement>);
  protected readonly hostClass = signal('');

  constructor() {
    afterEveryRender(() => {
      this.hostClass.set(computeUiStatusBadgeShimClasses(this._el.nativeElement));
    });
  }
}

/** Marker — merged into {@link UiStatusBadgeDirective} host classes. */
@Directive({
  selector: '[uiStatusBadgeSizeSm], [uiStatusPillSizeSm]',
  standalone: true,
})
export class UiStatusBadgeSizeSmDirective {}

/** Marker — merged into {@link UiStatusBadgeDirective} host classes. */
@Directive({
  selector: '[uiStatusBadgeSizeMd], [uiStatusPillSizeMd]',
  standalone: true,
})
export class UiStatusBadgeSizeMdDirective {}

/** Marker — merged into {@link UiStatusBadgeDirective} host classes. */
@Directive({
  selector: '[uiStatusBadgeNeutral], [uiStatusPillNeutral]',
  standalone: true,
})
export class UiStatusBadgeNeutralDirective {}

/** Marker — merged into {@link UiStatusBadgeDirective} host classes. */
@Directive({
  selector: '[uiStatusBadgeInfo], [uiStatusPillInfo]',
  standalone: true,
})
export class UiStatusBadgeInfoDirective {}

/** Marker — merged into {@link UiStatusBadgeDirective} host classes. */
@Directive({
  selector: '[uiStatusBadgeSuccess], [uiStatusPillSuccess]',
  standalone: true,
})
export class UiStatusBadgeSuccessDirective {}

/** Marker — merged into {@link UiStatusBadgeDirective} host classes. */
@Directive({
  selector: '[uiStatusBadgeWarning], [uiStatusPillWarning]',
  standalone: true,
})
export class UiStatusBadgeWarningDirective {}

/** Marker — merged into {@link UiStatusBadgeDirective} host classes. */
@Directive({
  selector: '[uiStatusBadgeError], [uiStatusPillError]',
  standalone: true,
})
export class UiStatusBadgeErrorDirective {}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({ selector: '[uiChipAction]', standalone: true })
export class UiChipActionDirective {}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({ selector: '[uiChipPassive]', standalone: true })
export class UiChipPassiveDirective {}

/** Marker — merged into {@link UiChipDirective} host classes. */
@Directive({ selector: '[uiChipSelected]', standalone: true })
export class UiChipSelectedDirective {}

@Directive({ selector: 'label[uiChoiceRow]', standalone: true, host: { class: 'ui-choice-row' } })
export class UiChoiceRowDirective {}

@Directive({
  selector: 'input[type="checkbox"][uiChoiceControl], input[type="radio"][uiChoiceControl]',
  standalone: true,
  host: { class: 'ui-choice-control' },
})
export class UiChoiceControlDirective {}

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
