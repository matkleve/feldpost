import { Component } from '@angular/core';
import { AccountComponent as SharedAccountComponent } from '../../shared/account/account.component';

@Component({
  selector: 'app-account-feature',
  standalone: true,
  imports: [SharedAccountComponent],
  template: `<app-account />`,
})
export class AccountFeatureComponent {}
