# search service module

Orchestrator: ./search-orchestrator.service.ts
Search bar data facade: ./search-bar.service.ts
Shared types: ./search.types.ts
Helpers: ./search.helpers.ts
Adapters: ./adapters/

This module keeps two explicit services because query orchestration and search-bar
data access have separate ownership. Do not import from a `search.service.ts`
barrel; import the concrete service that owns the behavior.
