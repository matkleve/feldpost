# search service module

Search engine: `./engine/search-engine.ts`  
Providers: `./providers/`  
Legacy facade: `./search-bar.service.ts` (geocoder + forward geocode utilities)  
Shared types: `./search.models.ts`  
Org tuning: `./org-search-tuning.service.ts`

Each UI consumer gets its own `SearchEngine` instance (component-scoped provider). Providers are root injectables; the engine composes them per surface.

Map search bar: `createMapSearchEngine()` — recents, addresses, projects, geocoder, commands.  
Detail address search: `createAddressSearchEngine()` — recents, addresses, geocoder.

Keyword operators: `#project` (exclusive), `+project` / `-project` (filter chips on map bar).
