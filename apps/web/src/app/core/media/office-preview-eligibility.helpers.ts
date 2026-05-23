import type { FileTypeDefinition } from './media-renderer.types';

/** File types that require server-side Gotenberg preview (v2). PDF uses client pdf.js. */
export function requiresServerPreviewGeneration(definition: FileTypeDefinition): boolean {
  return (
    definition.id === 'word' ||
    definition.id === 'spreadsheet' ||
    definition.id === 'presentation'
  );
}
