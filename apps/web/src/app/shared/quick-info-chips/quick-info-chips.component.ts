import { Component, input, output } from '@angular/core';
import { HLM_BADGE_IMPORTS } from '../ui/badge';

export type ChipAction = 'project' | 'captured_at' | 'coordinates';

export interface ChipDef {
  icon: string;
  text: string;
  variant?: 'default' | 'filled' | 'success' | 'warning';
  title?: string;
  action?: ChipAction;
}

@Component({
  selector: 'app-quick-info-chips',
  standalone: true,
  imports: [...HLM_BADGE_IMPORTS],
  templateUrl: './quick-info-chips.component.html',
  styleUrl: './quick-info-chips.component.scss',
})
export class QuickInfoChipsComponent {
  readonly chips = input<ChipDef[]>([]);
  readonly chipClicked = output<number>();

  chipBadgeVariant(chip: ChipDef): 'outline' | 'success' | 'warning' | 'secondary' {
    switch (chip.variant) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'filled':
        return 'secondary';
      default:
        return 'outline';
    }
  }
}
