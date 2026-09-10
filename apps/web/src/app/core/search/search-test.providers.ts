import { signal } from '@angular/core';
import { OrgSearchTuningService } from './org-search-tuning.service';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from './search-tuning.defaults';

type OrgSearchTuningDouble = Pick<
  OrgSearchTuningService,
  'orgSearchConfig' | 'bootstrapFromSession' | 'isOrgAdmin' | 'canEdit'
>;

/**
 * Test double for OrgSearchTuningService with system defaults.
 *
 * `orgSearchConfig` is `readonly` on the real service, so `Pick<>` carries that
 * modifier and a caller cannot reassign `.useValue.orgSearchConfig` after the
 * fact — pass `config` up front instead.
 */
export function provideOrgSearchTuningTestDouble(config = SEARCH_TUNING_SYSTEM_DEFAULTS): {
  provide: typeof OrgSearchTuningService;
  useValue: OrgSearchTuningDouble;
} {
  return {
    provide: OrgSearchTuningService,
    useValue: {
      orgSearchConfig: signal(config),
      bootstrapFromSession: async () => undefined,
      isOrgAdmin: signal(false),
      canEdit: signal(false),
    },
  };
}
