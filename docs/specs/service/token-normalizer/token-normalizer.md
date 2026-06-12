# Token Normalizer

> **Parent:** [address-resolution-model.md](../media-upload-service/address-resolution-model.md) (step 1b)

Normalizes folder/filename tokens to canonical English place-name fields before Search Object assembly.

## Module

- Code: `apps/web/src/app/core/token-normalizer/`
- MVP: delegates to `LocalGeoDataAdapter` (AT states, municipalities) and passes through unknown tokens.

## API

`TokenNormalizerService.normalizeToken(token: string): { value: string; field?: UploadDiscriminatingField; confidence: number }`

## Settings

`tokenNormalizerFuzzyThreshold` in [upload-location-config.md](../media-upload-service/upload-location-config.md).
