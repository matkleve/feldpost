import { Component, input, output } from '@angular/core';
import { ShellControlOptionComponent } from './shell-control-option.component';
import type { ShellControlOptionModel, ShellControlSide } from './shell-control.types';

/** Frosted group of control options. The rail outside this box has no background. */
@Component({
  selector: 'app-shell-control-container',
  standalone: true,
  imports: [ShellControlOptionComponent],
  templateUrl: './shell-control-container.component.html',
  styleUrl: './shell-control-container.component.scss',
})
export class ShellControlContainerComponent {
  readonly options = input.required<readonly ShellControlOptionModel[]>();
  readonly side = input.required<ShellControlSide>();
  readonly activeId = input<string | null>(null);
  readonly openIds = input<readonly string[]>([]);
  readonly chosen = output<ShellControlOptionModel>();

  isOpen(option: ShellControlOptionModel): boolean {
    return option.panelId !== undefined && this.openIds().includes(option.panelId);
  }

  choose(option: ShellControlOptionModel): void {
    if (option.kind === 'inert') return;
    this.chosen.emit(option);
  }
}
