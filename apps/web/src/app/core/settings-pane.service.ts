import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SettingsPaneService {
  private readonly _open = signal(false);

  readonly open = this._open.asReadonly();

  setOpen(open: boolean): void {
    this._open.set(open);
  }

  toggle(): void {
    this._open.update((current) => !current);
  }

  close(): void {
    this._open.set(false);
  }
}
