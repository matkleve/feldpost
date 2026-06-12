import { Injectable } from '@angular/core';
import { of, type Observable } from 'rxjs';
import type {
  SearchCandidate,
  SearchCommandCandidate,
  SearchQueryContext,
} from '../search.models';
import type { SearchProvider } from '../engine/search-provider.interface';

@Injectable({ providedIn: 'root' })
export class CommandProvider implements SearchProvider {
  readonly id = 'commands';
  readonly sectionTitle = 'Commands';
  readonly family = 'command' as const;
  readonly priority = 90;

  search(query: string, context: SearchQueryContext): Observable<SearchCandidate[]> {
    const commandMode = context.commandMode || query.trim().startsWith('/');
    if (!commandMode) {
      return of([]);
    }

    return of(this.buildCommandItems(query, context));
  }

  private buildCommandItems(query: string, context: SearchQueryContext): SearchCommandCandidate[] {
    const items: SearchCommandCandidate[] = [];
    const normalizedQuery = query.trim().toLowerCase();
    const slashCommandMode = normalizedQuery.startsWith('/');

    if (normalizedQuery.startsWith('/image')) {
      items.push({
        id: 'cmd-create-qr-invite',
        family: 'command',
        label: 'Create QR Invite',
        command: 'create-qr-invite',
      });
      return items;
    }

    if (!slashCommandMode && !context.commandMode) {
      return items;
    }

    const commandFilter =
      slashCommandMode && normalizedQuery.startsWith('/')
        ? normalizedQuery.slice(1)
        : normalizedQuery;

    const pushIfMatch = (
      id: string,
      label: string,
      command: SearchCommandCandidate['command'],
      payload?: string,
      visible = true,
    ) => {
      if (!visible) return;
      if (!commandFilter || label.toLowerCase().includes(commandFilter)) {
        items.push({ id, family: 'command', label, command, payload });
      }
    };

    pushIfMatch('cmd-upload', 'Upload photos', 'upload');
    pushIfMatch(
      'cmd-clear-filters',
      'Clear filters',
      'clear-filters',
      undefined,
      (context.activeFilterCount ?? 0) > 0,
    );
    pushIfMatch('cmd-go-location', 'Go to my location', 'go-to-location');

    return items;
  }
}
