import { Injectable } from '@angular/core';
import {
  CARD_VARIANT_DEFAULT,
  CARD_VARIANTS,
  type CardVariant,
  type CardVariantScope,
} from './card-variant.types';

@Injectable({ providedIn: 'root' })
export class CardVariantSettingsService {
  getVariant(scope: CardVariantScope): CardVariant {
    try {
      const raw = localStorage.getItem(this.storageKey(scope));
      return CARD_VARIANTS.includes(raw as CardVariant)
        ? (raw as CardVariant)
        : CARD_VARIANT_DEFAULT;
    } catch {
      return CARD_VARIANT_DEFAULT;
    }
  }

  setVariant(scope: CardVariantScope, variant: CardVariant): void {
    try {
      localStorage.setItem(this.storageKey(scope), variant);
    } catch {
      // Ignore storage write errors to keep UI interactive.
    }
  }

  private storageKey(scope: CardVariantScope): string {
    return `feldpost.settings.cards.${scope}.variant`;
  }
}
