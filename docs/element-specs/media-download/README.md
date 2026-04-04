# Media Download Adapters

Parent facade contract: [media-download-service.md](media-download-service.md)

## Adapter Specs

- [adapters/tier-resolver.adapter.md](adapters/tier-resolver.adapter.md)
- [adapters/signed-url-cache.adapter.md](adapters/signed-url-cache.adapter.md)
- [adapters/edge-export-orchestrator.adapter.md](adapters/edge-export-orchestrator.adapter.md)

## Ownership Split

| Adapter                  | Owns                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Tier Resolver            | desiredSize/boxPixels mapping, effective tier, fallback chain, proxy-ready URL strategy |
| Signed URL Cache         | signing, cache lifecycle, no-media and error mapping, blob bridge                       |
| Edge Export Orchestrator | edge ZIP request orchestration, stream progress mapping, export result contract         |

## Status

- The parent facade remains the only canonical media retrieval contract.
- Adapter specs are normative implementation boundaries for service decomposition.
- Legacy `media-delivery-orchestrator.md` and `photo-load-service.md` specs are archived and deprecated.
