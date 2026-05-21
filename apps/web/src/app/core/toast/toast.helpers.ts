import type { ToastCodeRef, ToastOptions } from './toast.types';

const TECHNICAL_DETAIL_MAX = 1200;

/** Resolves display fields and legacy `message` for dedupe/logging. */
export function normalizeToastOptions(options: ToastOptions): {
  message: string;
  title?: string;
  body?: string;
  detail?: string;
  codeRef?: ToastCodeRef;
} {
  const title = options.title?.trim() || undefined;
  const body = options.body?.trim() || undefined;
  const detail = options.detail?.trim() || undefined;
  const flat = options.message?.trim();

  if (title) {
    const message = [title, body, detail].filter(Boolean).join('\n');
    return { message, title, body, detail, codeRef: options.codeRef };
  }

  if (flat) {
    return { message: flat, codeRef: options.codeRef };
  }

  const message = [body, detail].filter(Boolean).join('\n') || 'Notification';
  return { message, body, detail, codeRef: options.codeRef };
}

export function truncateToastTechnicalDetail(value: string, max = TECHNICAL_DETAIL_MAX): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

export function formatToastCodeRef(ref: ToastCodeRef): string {
  return `${ref.file} · ${ref.fn}`;
}

/** Whether collapsed toast should offer an expand control. */
export function toastHasExpandableDetail(options: {
  body?: string;
  detail?: string;
}): boolean {
  return Boolean(options.detail?.trim());
}
