import { Directive, ElementRef, HostListener, inject, input, output } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly enabled = input(true, { alias: 'appClickOutsideEnabled' });
  readonly clickOutside = output<MouseEvent>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.enabled()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.host.nativeElement.contains(target)) {
      this.clickOutside.emit(event);
    }
  }
}
