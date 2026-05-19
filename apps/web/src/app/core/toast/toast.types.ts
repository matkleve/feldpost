export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  state: 'entering' | 'visible' | 'exiting';
  createdAt: number;
  startedAt: number;
  remainingMs?: number;
  action?: ToastAction;
}

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  dedupe?: boolean;
  action?: ToastAction;
}
