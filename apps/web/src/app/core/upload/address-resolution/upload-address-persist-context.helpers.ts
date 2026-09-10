/**
 * Upload persist address context — text vs coordinates-only routing for NF-40.
 * @see docs/specs/service/media-upload-service/address-resolution-model.md § Address precision principle
 */

import { formatSearchObjectLabel } from '../../location-path-parser/upload-search-object.builder';
import { usesTextPlacementSource } from '../location/upload-location-inputs.helpers';
import type { UploadJob } from '../upload-manager.types';
import type { UploadGroupResolutionState } from './upload-address-resolution.types';
import {
  capFieldsToPrecisionTier,
  deriveAddressPrecisionFromFields,
  parseGroupingKeyFields,
  type AddressPrecisionFields,
  type AddressPrecisionTier,
} from './upload-address-precision.helpers';

export interface UploadAddressPersistContext {
  /** True when folder/filename/tray established a usable text address before upload. */
  hasEstablishedTextAddress: boolean;
  /** Structured fields for text-first persist (preferred over reverse geocode). */
  fields: AddressPrecisionFields;
  /** Highest tier actually established for this upload. */
  precision: AddressPrecisionTier | null;
  /** Human-readable label for address_label column. */
  addressLabel: string | null;
}

export function buildUploadAddressPersistContext(args: {
  job: Pick<
    UploadJob,
    'titleAddress' | 'groupingKey' | 'locationSourceUsed' | 'batchId'
  >;
  groupState?: Pick<UploadGroupResolutionState, 'searchObject'> | null;
}): UploadAddressPersistContext | null {
  const titleAddress = args.job.titleAddress?.trim();
  const hasTextSource = usesTextPlacementSource(args.job as UploadJob) && !!titleAddress;
  if (!hasTextSource) {
    return null;
  }

  const searchObject = args.groupState?.searchObject;
  const groupingFields = args.job.groupingKey
    ? parseGroupingKeyFields(args.job.groupingKey)
    : null;

  const fields: AddressPrecisionFields = {
    country: searchObject?.country ?? groupingFields?.country ?? null,
    state: searchObject?.state ?? groupingFields?.state ?? null,
    postcode: searchObject?.postcode ?? groupingFields?.postcode ?? null,
    city: searchObject?.city ?? groupingFields?.city ?? null,
    street: searchObject?.street ?? groupingFields?.street ?? null,
    houseNumber: searchObject?.houseNumber ?? groupingFields?.houseNumber ?? null,
  };

  const precision = deriveAddressPrecisionFromFields(fields);
  const cappedFields = precision ? capFieldsToPrecisionTier(fields, precision) : fields;
  const addressLabel =
    (searchObject ? formatSearchObjectLabel(searchObject) : null) ?? titleAddress ?? null;

  return {
    hasEstablishedTextAddress: true,
    fields: cappedFields,
    precision,
    addressLabel,
  };
}
