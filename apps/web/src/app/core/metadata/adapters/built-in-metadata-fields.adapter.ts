import type { WorkspaceMedia } from '../../workspace-view/workspace-view.types';
import type { MetadataFieldDefinition } from '../metadata.types';

export const METADATA_TYPE_ICONS: Record<string, string> = {
  text: 'tag',
  select: 'arrow_drop_down_circle',
  number: 'numbers',
  date: 'event',
  checkbox: 'check_box',
};

export const BUILT_IN_METADATA_FIELDS: MetadataFieldDefinition[] = [
  createField('date-captured', 'Date captured', 'schedule', 'date', 'desc'),
  createField('date-uploaded', 'Date uploaded', 'cloud_upload', 'date', 'desc'),
  createField('name', 'Name', 'sort_by_alpha', 'text', 'asc', true),
  createField('distance', 'Distance', 'straighten', 'number', 'asc'),
  createField('address', 'Address', 'location_on', 'text', 'asc', true),
  createField('city', 'City', 'location_city', 'text', 'asc', true),
  createField('district', 'District', 'map', 'text', 'asc', true),
  createField('street', 'Street', 'signpost', 'text', 'asc', true),
  createField('country', 'Country', 'flag', 'text', 'asc', true),
  createField('project', 'Project', 'folder', 'text', 'asc', true),
  createField('date', 'Date', 'schedule', 'date', 'desc'),
  createField('year', 'Year', 'calendar_today', 'date', 'desc'),
  createField('month', 'Month', 'date_range', 'date', 'desc'),
  createField('user', 'User', 'person', 'text', 'asc', true),
];

export function resolveBuiltInMetadataValue(
  media: WorkspaceMedia,
  fieldId: string,
): string | number | null {
  const resolver = BUILT_IN_VALUE_RESOLVERS[fieldId];
  return resolver ? resolver(media) : null;
}

export function resolveBuiltInGroupingLabel(
  media: WorkspaceMedia,
  fieldId: string,
  formatters: BuiltInGroupingFormatters,
): string | null {
  const resolver = BUILT_IN_GROUPING_RESOLVERS[fieldId];
  return resolver ? resolver(media, formatters) : null;
}

interface BuiltInGroupingFormatters {
  t: (value: string) => string;
  formatDate: (value: string, options: Intl.DateTimeFormatOptions) => string;
}

const BUILT_IN_VALUE_RESOLVERS: Record<string, (media: WorkspaceMedia) => string | number | null> =
  {
    'date-captured': (media) => media.capturedAt,
    captured_at: (media) => media.capturedAt,
    'date-uploaded': (media) => media.createdAt,
    created_at: (media) => media.createdAt,
    name: (media) => media.storagePath,
    distance: () => null,
    address: (media) => media.addressLabel,
    city: (media) => media.city,
    district: (media) => media.district,
    street: (media) => media.street,
    country: (media) => media.country,
    project: (media) =>
      media.projectNames && media.projectNames.length > 0
        ? media.projectNames.join(', ')
        : media.projectName,
    date: (media) => media.capturedAt,
    year: (media) => media.capturedAt,
    month: (media) => media.capturedAt,
    user: (media) => media.userName,
  };

const BUILT_IN_GROUPING_RESOLVERS: Record<
  string,
  (media: WorkspaceMedia, formatters: BuiltInGroupingFormatters) => string
> = {
  'date-captured': (media, f) =>
    media.capturedAt
      ? f.formatDate(media.capturedAt, { year: 'numeric', month: 'long', day: 'numeric' })
      : f.t('Unknown date'),
  date: (media, f) =>
    media.capturedAt
      ? f.formatDate(media.capturedAt, { year: 'numeric', month: 'long', day: 'numeric' })
      : f.t('Unknown date'),
  'date-uploaded': (media, f) =>
    media.createdAt
      ? f.formatDate(media.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })
      : f.t('Unknown date'),
  name: (media, f) => media.storagePath ?? f.t('Unnamed'),
  distance: (_media, f) => f.t('Unknown distance'),
  project: (media, f) => {
    if (media.projectNames && media.projectNames.length > 0) {
      return media.projectNames.length === 1
        ? media.projectNames[0]
        : `${media.projectNames[0]} +${media.projectNames.length - 1}`;
    }
    return media.projectName ?? f.t('No project');
  },
  year: (media, f) =>
    media.capturedAt ? new Date(media.capturedAt).getFullYear().toString() : f.t('Unknown year'),
  month: (media, f) =>
    media.capturedAt
      ? f.formatDate(media.capturedAt, { year: 'numeric', month: 'long' })
      : f.t('Unknown month'),
  city: (media, f) => media.city ?? f.t('Unknown city'),
  district: (media, f) => media.district ?? f.t('Unknown district'),
  street: (media, f) => media.street ?? f.t('Unknown street'),
  country: (media, f) => media.country ?? f.t('Unknown country'),
  address: (media, f) => media.addressLabel ?? f.t('Unknown address'),
  user: (media, f) => media.userName ?? f.t('Unknown user'),
};

function createField(
  id: string,
  label: string,
  icon: string,
  valueType: MetadataFieldDefinition['valueType'],
  defaultSortDirection: 'asc' | 'desc',
  searchable = false,
): MetadataFieldDefinition {
  return {
    id,
    label,
    icon,
    valueType,
    capabilities: { sortable: true, groupable: true, filterable: true, searchable },
    defaultSortDirection,
    builtIn: true,
  };
}
