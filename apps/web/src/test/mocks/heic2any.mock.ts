type Heic2AnyInput = {
  blob: Blob;
  toType?: string;
  quality?: number;
};

export default async function heic2any(input: Heic2AnyInput): Promise<Blob> {
  // Test-safe no-op conversion: returns original blob to avoid Worker dependency in jsdom.
  return input.blob;
}
