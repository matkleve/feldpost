import type { SegmentedSwitchOption } from '../../shared/segmented-switch/segmented-switch.component';

/**
 * Factory for creating language options array.
 * Language labels stay in native form (never translated by active locale).
 */
export function buildLanguageOptions(): ReadonlyArray<SegmentedSwitchOption> {
  return [
    { id: 'en', label: 'English' },
    { id: 'de', label: 'Deutsch' },
    { id: 'it', label: 'Italiano' },
  ];
}

/**
 * Factory for creating option arrays with i18n translation.
 */
export function buildDensityOptions(
  t: (key: string, fallback: string) => string,
): ReadonlyArray<SegmentedSwitchOption> {
  return [
    {
      id: 'compact',
      label: t('settings.overlay.general.density.option.compact', 'Compact'),
    },
    {
      id: 'comfortable',
      label: t('settings.overlay.general.density.option.comfortable', 'Comfortable'),
    },
  ];
}

export function buildThemeModeOptions(
  t: (key: string, fallback: string) => string,
): ReadonlyArray<SegmentedSwitchOption> {
  return [
    {
      id: 'light',
      label: t('settings.overlay.appearance.themeMode.option.light', 'Light'),
    },
    {
      id: 'dark',
      label: t('settings.overlay.appearance.themeMode.option.dark', 'Dark'),
    },
    {
      id: 'system',
      label: t('settings.overlay.appearance.themeMode.option.system', 'System'),
    },
    {
      id: 'sandstone',
      label: t('settings.overlay.appearance.themeMode.option.sandstone', 'Sandstone'),
    },
  ];
}

export function buildMarkerMotionOptions(
  t: (key: string, fallback: string) => string,
): ReadonlyArray<SegmentedSwitchOption> {
  return [
    {
      id: 'off',
      label: t('settings.overlay.map.markerMotion.option.off', 'Off'),
    },
    {
      id: 'smooth',
      label: t('settings.overlay.map.markerMotion.option.smooth', 'Smooth'),
    },
  ];
}
