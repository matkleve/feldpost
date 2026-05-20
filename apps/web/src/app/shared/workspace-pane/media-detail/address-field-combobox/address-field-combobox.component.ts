/**
 * AddressFieldComboboxComponent — per-field hierarchical address combobox.
 *
 * Replaces the plain <input> in each address field row when editing is active.
 * Provides assistive suggestions constrained by sibling field values.
 * Free-text entry is always allowed.
 *
 * @see docs/specs/component/address-field-combobox/address-field-combobox.md
 */

import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DropdownShellComponent } from '../../../dropdown-trigger/dropdown-shell.component';
import { AddressFieldSuggestService } from '../../../../core/address-field-suggest/address-field-suggest.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { AddressFieldKind, AddressFieldContext, AddressFieldSuggestion } from '../../../../core/address-field-suggest/address-field-suggest.types';

type ComboboxState = 'closed' | 'typing' | 'loading' | 'open' | 'empty';

@Component({
  selector: 'app-address-field-combobox',
  standalone: true,
  imports: [DropdownShellComponent],
  templateUrl: './address-field-combobox.component.html',
  styleUrl: './address-field-combobox.component.scss',
  host: {
    '[attr.data-state]': 'state()',
    '[attr.data-detail-active-editor]': 'field()',
  },
})
export class AddressFieldComboboxComponent implements OnDestroy {
  private readonly suggestService = inject(AddressFieldSuggestService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // ── Inputs ─────────────────────────────────────────────────────────────────

  readonly field = input.required<AddressFieldKind>();
  readonly icon = input.required<string>();
  readonly labelKey = input.required<string>();
  readonly labelFallback = input.required<string>();
  readonly editAriaKey = input.required<string>();
  readonly editAriaFallback = input.required<string>();
  readonly saveAriaKey = input.required<string>();
  readonly saveAriaFallback = input.required<string>();
  readonly saveTitleKey = input.required<string>();
  readonly saveTitleFallback = input.required<string>();
  readonly value = input<string>('');
  readonly context = input<AddressFieldContext>({});
  readonly verificationState = input<'verified' | 'unverified' | 'unknown'>('unknown');

  // ── Outputs ────────────────────────────────────────────────────────────────

  /** Emitted on blur / Enter when no suggestion was picked (free-text). */
  readonly valueChange = output<string>();
  /** Emitted when user picks a suggestion from the dropdown. */
  readonly suggestionSelected = output<AddressFieldSuggestion>();
  readonly saveRequested = output<string>();
  readonly cancelRequested = output<void>();

  // ── Internal state ─────────────────────────────────────────────────────────

  // Stable state: closed — input visible, panel hidden
  // @see docs/specs/component/address-field-combobox/address-field-combobox.md
  readonly inputValue = signal('');
  readonly suggestions = signal<AddressFieldSuggestion[]>([]);
  readonly loading = signal(false);
  readonly panelOpen = signal(false);
  readonly focusedIndex = signal(-1);

  readonly orgDbSuggestions = computed(() =>
    this.suggestions().filter((s) => s.source === 'org-db'),
  );
  readonly geocoderSuggestions = computed(() =>
    this.suggestions().filter((s) => s.source === 'geocoder'),
  );

  readonly state = computed<ComboboxState>(() => {
    if (this.loading()) return 'loading';
    if (this.panelOpen()) {
      if (this.suggestions().length > 0) return 'open';
      return 'empty';
    }
    return 'closed';
  });

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('comboboxInput');
  private readonly fieldCenterRef = viewChild<ElementRef<HTMLElement>>('fieldCenter');
  readonly fieldAnchorEl = computed(() => this.fieldCenterRef()?.nativeElement ?? null);
  readonly fieldCenterWidth = computed(
    () => this.fieldCenterRef()?.nativeElement.offsetWidth ?? null,
  );
  readonly showResultsPanel = computed(
    () =>
      this.panelOpen() &&
      (this.loading() ||
        this.suggestions().length > 0 ||
        this.inputValue().trim().length >= (this.field() === 'country' ? 0 : 2)),
  );

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private ignoreOutsideCloseUntil = 0;

  constructor() {
    // Sync initial value from input signal
    effect(() => {
      const v = this.value();
      if (!this.panelOpen()) {
        this.inputValue.set(v);
      }
    });

    // Auto-focus on mount
    effect(() => {
      const ref = this.inputRef();
      if (ref) {
        setTimeout(() => {
          ref.nativeElement.focus();
          const len = ref.nativeElement.value.length;
          ref.nativeElement.setSelectionRange(len, len);
        }, 0);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.panelOpen() || Date.now() < this.ignoreOutsideCloseUntil) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closePanel();
    }
  }

  // ── Template event handlers ─────────────────────────────────────────────────

  onInput(value: string): void {
    this.inputValue.set(value);
    this.focusedIndex.set(-1);
    this.scheduleQuery(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closePanel();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.panelOpen() && this.focusedIndex() >= 0) {
        const all = this.allSuggestions();
        const s = all[this.focusedIndex()];
        if (s) this.pickSuggestion(s);
      } else if (this.panelOpen() && this.suggestions().length > 0) {
        const first = this.allSuggestions()[0];
        if (first) this.pickSuggestion(first);
      } else {
        this.emitFreeText();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.panelOpen()) return;
      const max = this.suggestions().length - 1;
      this.focusedIndex.set(Math.min((this.focusedIndex() + 1), max));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.panelOpen()) return;
      const idx = this.focusedIndex() - 1;
      if (idx < 0) {
        this.focusedIndex.set(-1);
        this.inputRef()?.nativeElement.focus();
      } else {
        this.focusedIndex.set(idx);
      }
    }
  }

  onBlur(): void {
    // Delay so click on suggestion fires first
    setTimeout(() => {
      if (!this.panelOpen()) {
        this.emitFreeText();
      }
    }, 150);
  }

  pickSuggestion(suggestion: AddressFieldSuggestion): void {
    this.inputValue.set(suggestion.value);
    this.closePanel();
    this.suggestionSelected.emit(suggestion);
  }

  onSaveClick(): void {
    this.closePanel();
    const val = this.inputValue().trim();
    this.saveRequested.emit(val);
  }

  onCancelClick(): void {
    this.closePanel();
    this.cancelRequested.emit();
  }

  allSuggestions(): AddressFieldSuggestion[] {
    return [...this.orgDbSuggestions(), ...this.geocoderSuggestions()];
  }

  suggestionIndex(tier: 'org-db' | 'geocoder', localIndex: number): number {
    if (tier === 'org-db') return localIndex;
    return this.orgDbSuggestions().length + localIndex;
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private scheduleQuery(query: string): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    // Country is synchronous
    if (this.field() === 'country') {
      const results = this.suggestService.filterCountries(query).map(
        (c): AddressFieldSuggestion => ({
          value: c.name,
          source: 'geocoder',
          score: 1,
          countryCode: c.code,
        }),
      );
      this.suggestions.set(results);
      this.panelOpen.set(true);
      this.ignoreOutsideCloseUntil = Date.now() + 150;
      return;
    }

    if (query.trim().length < 2) {
      this.suggestions.set([]);
      this.panelOpen.set(false);
      return;
    }

    this.debounceTimer = setTimeout(() => void this.runQuery(query), 400);
  }

  private async runQuery(query: string): Promise<void> {
    this.loading.set(true);
    this.panelOpen.set(true);
    this.ignoreOutsideCloseUntil = Date.now() + 150;

    try {
      const results = await this.suggestService.suggest(this.field(), query, this.context());
      this.suggestions.set(results);
    } finally {
      this.loading.set(false);
    }
  }

  private closePanel(): void {
    this.panelOpen.set(false);
    this.suggestions.set([]);
    this.focusedIndex.set(-1);
  }

  private emitFreeText(): void {
    const val = this.inputValue().trim();
    if (val !== this.value()) {
      this.valueChange.emit(val);
    }
  }
}
