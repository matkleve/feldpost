import { Component } from '@angular/core';

/** Occupies the router outlet for map routes; map UI lives in the layout hidden host. */
@Component({
  selector: 'app-shell-route-placeholder',
  template: '',
  host: {
    class: 'block min-h-0 min-w-0 flex-1',
  },
})
export class ShellRoutePlaceholderComponent {}
