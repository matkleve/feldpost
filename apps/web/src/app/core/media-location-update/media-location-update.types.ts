export interface MediaLocationAddressPatch {
  address_label?: string | null;
  street?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
}

export interface MediaLocationUpdateResult {
  ok: boolean;
  error?: string;
  lat?: number;
  lng?: number;
  address?: MediaLocationAddressPatch;
}
