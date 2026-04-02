type MediaTypeDefinitionLike = {
  category: 'image' | 'video' | 'document' | 'spreadsheet' | 'presentation' | 'audio' | string;
  id: string;
  label: string;
};

export function resolveMediaTypeLabel(
  definition: MediaTypeDefinitionLike,
  badge: string | null,
  t: (key: string, fallback: string) => string,
): string {
  switch (definition.category) {
    case 'image':
      return t('media.meta.type.image', 'Image');
    case 'video':
      return t('media.meta.type.video', 'Video');
    case 'document':
      return definition.id === 'pdf' ? t('media.meta.type.pdf', 'PDF') : definition.label;
    case 'spreadsheet':
    case 'presentation':
    case 'audio':
      return definition.label;
    default:
      return badge ?? definition.label;
  }
}

export function formatMediaItemDate(
  dateString: string | null,
  locale: string,
  includeTime = false,
): string {
  if (!dateString) {
    return '';
  }

  try {
    const options: Intl.DateTimeFormatOptions = includeTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' };
    return new Intl.DateTimeFormat(locale, options).format(new Date(dateString));
  } catch {
    return '';
  }
}
