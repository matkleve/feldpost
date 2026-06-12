export interface MediaLocationAddressPatch {
  address_label?: string | null;
  street?: string | null;
  house_number?: string | null;
  staircase?: string | null;
  door?: string | null;
  floor?: string | null;
  postcode?: string | null;
  extra_information?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MediaLocationUpdateResult {
  ok: boolean;
  error?: string;
  lat?: number;
  lng?: number;
  address?: MediaLocationAddressPatch;
}
