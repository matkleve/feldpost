/** The only migration flag. A second member means the module is becoming a platform. */
export const FEATURE_FLAG_NAMES = ['shellGridLayout'] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

/** Default until the last phase deletes the flag. */
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagName, boolean> = {
  shellGridLayout: false,
};

export interface FlagSources {
  /** Raw `ff` query value, or null when the parameter is absent. */
  query: string | null;
  /** Stored `'true'` / `'false'`, or null when unset. */
  stored: string | null;
}

export interface ResolvedFlag {
  value: boolean;
  /** Written to storage when the query forced a value. Null means leave storage alone. */
  persist: boolean | null;
}
