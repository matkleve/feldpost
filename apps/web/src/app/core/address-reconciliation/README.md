# address-reconciliation service module

Facade: ./address-reconciliation.service.ts

## Purpose

Checks unverified address fields on a media item and offers a forward-geocode based
correction to the user. Never silently overwrites. User chooses: Apply / Don't ask again / Retry.

## Spec

docs/specs/service/location-resolver/address-reconciliation.md
