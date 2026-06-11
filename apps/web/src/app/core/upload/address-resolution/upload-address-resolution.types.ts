/**
 * Search Object and batch resolution cache types for upload address pipeline.
 * @see docs/specs/service/media-upload-service/upload-search-object.md
 */

import type { AddressLayerEntry } from '../../location-path-parser/upload-search-object.layer-map';
import type {
  UploadAddressCandidate,
  UploadDiscriminatingField,
} from '../upload-manager.types';

export type UploadAddressFieldSource = 'folder' | 'filename';

export interface UploadAddressSourceEntry {
  field: string;
  value: string;
  source: UploadAddressFieldSource;
  confidence: number;
  uncertain?: boolean;
}

export interface UploadAddressSourceDeviation {
  field: string;
  folderValue: string;
  filenameValue: string;
}

/** Leaf-level address extracted from relativePath + fileName (English field names). */
export interface UploadSearchObject {
  country: string | null;
  state: string | null;
  postcode: string | null;
  city: string | null;
  street: string | null;
  houseNumber: string | null;
  staircase: string | null;
  door: string | null;
  project: string | null;
  sources: UploadAddressSourceEntry[];
  sourceDeviations: UploadAddressSourceDeviation[];
  postcodeCandidates: string[];
  uncertainFields: string[];
  groupingKey: string;
  relativePath: string;
  fileName: string;
}

export type UploadGroupResolutionStatus =
  | 'resolved'
  | 'partial'
  | 'needsGeocode'
  | 'needsLayerResolution'
  | 'needsTray'
  | 'ambiguous';

export type UploadGeocodeBranch = 'branch_a' | 'branch_b' | 'branch_c' | 'metadata_only';

export type UploadTrayStep = '1a' | '1b' | '2' | '3';

export interface UploadProjectCentroid {
  lat: number;
  lng: number;
  city?: string | null;
  zoom?: number;
}

export interface UploadLocationRowHit {
  id: string;
  latitude: number;
  longitude: number;
  street: string | null;
  house_number: string | null;
  postcode: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  address_label: string | null;
}

export interface UploadGroupResolutionState {
  status: UploadGroupResolutionStatus;
  groupingKey: string;
  jobIds: string[];
  searchObject: UploadSearchObject;
  folderDisplayPath: string;
  titleAddressLabel: string;
  geocodeBranch?: UploadGeocodeBranch;
  projectCentroid?: UploadProjectCentroid;
  trayStep?: UploadTrayStep;
  confirmedCity?: string | null;
  candidate?: UploadAddressCandidate;
  candidates?: UploadAddressCandidate[];
  discriminatingField?: UploadDiscriminatingField;
  /** Raw layer packages for audit — @see upload-search-object.layer-map.md */
  addressLayers?: AddressLayerEntry[];
  /** Tray merge key for layer_package groups. */
  layerConflictQueryKey?: string;
}
