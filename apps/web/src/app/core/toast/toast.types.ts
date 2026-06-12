export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

/** Short pointer to app code that surfaced the toast (file + function only). */
export interface ToastCodeRef {
  file: string;
  fn: string;
}

export interface ToastItem {
  id: string;
  /** Legacy flat message; derived from title + body when structured fields are set. */
  message: string;
  type: ToastType;
  duration: number;
  state: 'entering' | 'visible' | 'exiting';
  createdAt: number;
  startedAt: number;
  remainingMs?: number;
  action?: ToastAction;
  title?: string;
  body?: string;
  detail?: string;
  codeRef?: ToastCodeRef;
}

export interface ToastOptions {
  /** Flat message (legacy). Ignored when `title` is set. */
  message?: string;
  title?: string;
  body?: string;
  /** Extra lines shown when the user expands the toast. */
  detail?: string;
  codeRef?: ToastCodeRef;
  type?: ToastType;
  duration?: number;
  dedupe?: boolean;
  action?: ToastAction;
}
