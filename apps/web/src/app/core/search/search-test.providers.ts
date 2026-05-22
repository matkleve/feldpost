import { signal } from '@angular/core';
import { OrgSearchTuningService } from './org-search-tuning.service';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from './search-tuning.defaults';

/** Test double for OrgSearchTuningService with system defaults. */
export function provideOrgSearchTuningTestDouble(): {
  provide: typeof OrgSearchTuningService;
  useValue: Pick<
    OrgSearchTuningService,
    'orgSearchConfig' | 'bootstrapFromSession' | 'isOrgAdmin' | 'canEdit'
  >;
} {
  return {
    provide: OrgSearchTuningService,
    useValue: {
      orgSearchConfig: signal(SEARCH_TUNING_SYSTEM_DEFAULTS),
      bootstrapFromSession: async () => undefined,
      isOrgAdmin: signal(false),
      canEdit: signal(false),
    },
  };
}
