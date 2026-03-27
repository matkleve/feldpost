export type MediaTier = 'inline' | 'small' | 'mid' | 'mid2' | 'large' | 'full';

export type MediaContext = 'map' | 'grid' | 'upload' | 'detail';

export type MediaRenderStatus = 'placeholder' | 'icon-only' | 'loading' | 'loaded' | 'error';

export type MediaRenderState =
  | { status: 'placeholder' }
  | { status: 'icon-only' }
  | { status: 'loading'; progress?: number }
  | {
      status: 'loaded';
      url: string;
      width?: number;
      height?: number;
      resolvedTier: MediaTier;
    }
  | { status: 'error'; reason: string };

export type AspectRatioPolicy =
  | { type: 'fixed'; width: number; height: number }
  | { type: 'native' }
  | { type: 'free' };

export type FileTypeCategory =
  | 'image'
  | 'video'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'audio'
  | 'unknown';

export interface FileTypeDefinition {
  id: string;
  label: string;
  category: FileTypeCategory;
  colorToken: string;
  icon: string;
  aspectRatio: AspectRatioPolicy;
  mimeTypes: readonly string[];
  extensions: readonly string[];
}

export interface FileTypeLookupInput {
  mimeType?: string | null;
  fileName?: string | null;
  extension?: string | null;
}

export interface MediaFileIdentity {
  mimeType?: string | null;
  fileName?: string | null;
  extension?: string | null;
}

export interface UploadOverlayState {
  progress?: number;
  label?: string;
  phase?: string;
}

export interface MediaTierSelectionInput {
  requestedTier: MediaTier;
  slotWidthRem?: number | null;
  slotHeightRem?: number | null;
  context?: MediaContext;
}
