import { SearchEngine } from './search-engine';
import type { SearchEngineOptions } from '../search.models';
import type { SearchProvider } from './search-provider.interface';
import { RecentsProvider } from '../providers/recents.provider';
import { DbAddressProvider } from '../providers/db-address.provider';
import { ProjectsProvider } from '../providers/projects.provider';
import { GeocoderProvider } from '../providers/geocoder.provider';
import { CommandProvider } from '../providers/command.provider';
import type { OrgSearchTuningService } from '../org-search-tuning.service';

export function engineOptionsFromOrgTuning(
  orgSearchTuning: OrgSearchTuningService,
): SearchEngineOptions {
  const orchestrator = orgSearchTuning.orgSearchConfig().orchestrator;
  const resolver = orgSearchTuning.orgSearchConfig().resolver;
  return {
    debounceMs: orchestrator.debounceMs,
    cacheTtlMs: orchestrator.cacheTtlMs,
    recentMaxItems: orchestrator.recentMaxItems,
    geocoderDedupMeters: orchestrator.geocoderDedupMeters,
    maxGeocoderSectionItems: resolver.maxGeocoderResults,
  };
}

export function createMapSearchEngine(
  providers: {
    recents: RecentsProvider;
    dbAddress: DbAddressProvider;
    projects: ProjectsProvider;
    geocoder: GeocoderProvider;
    commands: CommandProvider;
  },
  orgSearchTuning: OrgSearchTuningService,
): SearchEngine {
  const options = engineOptionsFromOrgTuning(orgSearchTuning);
  providers.recents.configure({ recentMaxItems: options.recentMaxItems });
  providers.geocoder.configure({ maxGeocoderSectionItems: options.maxGeocoderSectionItems });

  return SearchEngine.create(
    [
      providers.recents,
      providers.dbAddress,
      providers.projects,
      providers.geocoder,
      providers.commands,
    ],
    options,
  );
}

export function createAddressSearchEngine(
  providers: {
    recents: RecentsProvider;
    dbAddress: DbAddressProvider;
    geocoder: GeocoderProvider;
  },
  orgSearchTuning: OrgSearchTuningService,
): SearchEngine {
  const options = engineOptionsFromOrgTuning(orgSearchTuning);
  providers.recents.configure({ recentMaxItems: options.recentMaxItems });
  providers.geocoder.configure({ maxGeocoderSectionItems: options.maxGeocoderSectionItems });

  return SearchEngine.create(
    [providers.recents, providers.dbAddress, providers.geocoder],
    options,
  );
}

export function createCustomSearchEngine(
  providerList: SearchProvider[],
  options?: Partial<SearchEngineOptions>,
): SearchEngine {
  return SearchEngine.create(providerList, options);
}
