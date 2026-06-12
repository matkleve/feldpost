import type { MetadataValueType } from './metadata.types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type MetadataComposeValueType = Extract<MetadataValueType, 'text' | 'number' | 'date'>;

export function toMetadataComposeValueType(
  valueType: MetadataValueType | string,
): MetadataComposeValueType {
  if (valueType === 'number' || valueType === 'date') return valueType;
  return 'text';
}

export interface MetadataValueValidationResult {
  valid: boolean;
  normalizedValue: string;
  errorKey?: string;
  errorFallback?: string;
}

export function normalizeMetadataKeyName(keyName: string): string {
  return keyName.trim().toLowerCase();
}

export function propertyExclusionKey(metadataKeyId: string): string {
  return `id:${metadataKeyId}`;
}

export function draftExclusionKey(valueType: string, keyName: string): string {
  return `def:${valueType}|${normalizeMetadataKeyName(keyName)}`;
}

export function validateMetadataValueForSave(
  valueType: MetadataComposeValueType,
  rawValue: string,
): MetadataValueValidationResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedValue: '',
      errorKey: 'workspace.metadata.validation.value.required',
      errorFallback: 'Value is required',
    };
  }

  if (valueType === 'number') {
    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) {
      return {
        valid: false,
        normalizedValue: trimmed,
        errorKey: 'workspace.metadata.validation.value.number',
        errorFallback: 'Enter a valid number',
      };
    }
    return { valid: true, normalizedValue: trimmed };
  }

  if (valueType === 'date') {
    if (!ISO_DATE_PATTERN.test(trimmed)) {
      return {
        valid: false,
        normalizedValue: trimmed,
        errorKey: 'workspace.metadata.validation.value.date',
        errorFallback: 'Enter a valid date',
      };
    }
    return { valid: true, normalizedValue: trimmed };
  }

  return { valid: true, normalizedValue: trimmed };
}
