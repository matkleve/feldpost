import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import type { LanguageCode } from './translation-catalog';

@Injectable({ providedIn: 'root' })
export class DomTranslationService {
  private readonly documentRef = inject(DOCUMENT);
  private readonly i18nService = inject(I18nService);
  private readonly nodeOriginalText = new WeakMap<Text, string>();
  private readonly elementOriginalAttrs = new WeakMap<Element, Map<string, string>>();
  private observer: MutationObserver | null = null;
  private started = false;

  constructor() {
    effect(() => {
      const language = this.i18nService.language();
      this.i18nService.runtimeRevision();
      if (!this.started) return;
      this.translateSubtree(this.documentRef.body, language);
    });
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.translateSubtree(this.documentRef.body, this.i18nService.language());

    this.observer = new MutationObserver((mutations) => {
      const language = this.i18nService.language();

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            this.translateSubtree(node, language);
          } else if (node instanceof Text) {
            this.translateTextNode(node, language);
          }
        }

        if (mutation.type === 'characterData' && mutation.target instanceof Text) {
          this.translateTextNode(mutation.target, language);
        }
      }
    });

    this.observer.observe(this.documentRef.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private translateSubtree(root: ParentNode | null, language: LanguageCode): void {
    if (!root) return;

    const walker = this.documentRef.createTreeWalker(root, NodeFilter.SHOW_ALL);
    let current: Node | null = walker.currentNode;

    while (current) {
      if (current instanceof Text) {
        this.translateTextNode(current, language);
      } else if (current instanceof Element) {
        this.translateElementAttributes(current, language);
      }

      current = walker.nextNode();
    }
  }

  private translateTextNode(node: Text, language: LanguageCode): void {
    const parent = node.parentElement;
    if (parent && this.isIgnoredElement(parent)) {
      return;
    }

    const cachedOriginal = this.nodeOriginalText.get(node);
    const source = cachedOriginal ?? node.textContent ?? '';

    if (!cachedOriginal) {
      this.nodeOriginalText.set(node, source);
    }

    const next = this.translatePreservingWhitespace(source, language);
    if (node.textContent !== next) {
      node.textContent = next;
    }
  }

  private translateElementAttributes(element: Element, language: LanguageCode): void {
    if (this.isIgnoredElement(element)) {
      return;
    }

    const attrs = ['title', 'aria-label', 'placeholder'];

    for (const attr of attrs) {
      const current = element.getAttribute(attr);
      if (!current) continue;

      let originalAttrs = this.elementOriginalAttrs.get(element);
      if (!originalAttrs) {
        originalAttrs = new Map<string, string>();
        this.elementOriginalAttrs.set(element, originalAttrs);
      }

      if (!originalAttrs.has(attr)) {
        originalAttrs.set(attr, current);
      }

      const source = originalAttrs.get(attr) ?? current;
      const translated = this.translatePreservingWhitespace(source, language);
      if (translated !== current) {
        element.setAttribute(attr, translated);
      }
    }
  }

  private translatePreservingWhitespace(value: string, language: LanguageCode): string {
    if (language === 'en') return value;

    const leading = value.match(/^\s*/)?.[0] ?? '';
    const trailing = value.match(/\s*$/)?.[0] ?? '';
    const core = value.trim();

    if (!core || !/[A-Za-z]/.test(core)) {
      return value;
    }

    const translatedCore = this.i18nService.translateOriginal(core, core);
    return `${leading}${translatedCore}${trailing}`;
  }

  private isIgnoredElement(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    return (
      tag === 'script' ||
      tag === 'style' ||
      tag === 'code' ||
      tag === 'pre' ||
      tag === 'textarea' ||
      element.classList.contains('material-icons')
    );
  }
}
