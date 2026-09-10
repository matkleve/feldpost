/**
 * Focus management helpers for upload panel modal surfaces.
 * @see docs/specs/component/upload/upload-panel.md
 */

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function queryFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

export function focusFirstElement(container: HTMLElement): void {
  queryFocusableElements(container)[0]?.focus();
}

export interface UploadPanelFocusTrap {
  release: () => void;
}

/** Trap Tab within container and restore focus to the previously focused element on release. */
export function trapUploadPanelFocus(container: HTMLElement): UploadPanelFocusTrap {
  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  focusFirstElement(container);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = queryFocusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', onKeyDown);

  return {
    release: () => {
      container.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    },
  };
}
