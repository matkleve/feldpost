import {
  Component,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-coordinates-field-editor',
  standalone: true,
  templateUrl: './coordinates-field-editor.component.html',
  styleUrls: ['./coordinates-field-editor.component.scss', '../_detail-row-slots.scss'],
  host: {
    '[attr.data-state]': '"editing"',
    '[attr.data-detail-active-editor]': '"coordinates"',
  },
})
export class CoordinatesFieldEditorComponent implements OnInit {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly icon = input('gps_fixed');
  readonly isCorrected = input(false);
  readonly initialValue = input('');

  readonly saveRequested = output<string>();
  readonly cancelRequested = output<void>();

  readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('coordInput');

  ngOnInit(): void {
    queueMicrotask(() => this.inputRef()?.nativeElement.focus());
  }

  onSaveClick(): void {
    const value = this.inputRef()?.nativeElement.value ?? '';
    this.saveRequested.emit(value);
  }

  onCancelClick(): void {
    this.cancelRequested.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSaveClick();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancelClick();
    }
  }
}
