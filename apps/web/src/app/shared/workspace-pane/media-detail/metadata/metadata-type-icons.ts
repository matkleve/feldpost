import type { MetadataComposeValueType } from '../../../../core/metadata/metadata-validation.helpers';

export const METADATA_COMPOSE_TYPE_ICONS: Record<MetadataComposeValueType, string> = {
  text: 'tag',
  number: 'numbers',
  date: 'event',
};

export const METADATA_COMPOSE_TYPE_ORDER: MetadataComposeValueType[] = ['text', 'number', 'date'];
