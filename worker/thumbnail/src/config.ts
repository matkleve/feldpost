export type WorkerConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  mediaBucketName: string;
  port: number;
};

export function loadConfig(): WorkerConfig {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const mediaBucketName = process.env.MEDIA_BUCKET_NAME?.trim() || 'media';
  const portRaw = process.env.PORT?.trim() || '3001';
  const port = Number.parseInt(portRaw, 10);

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required');
  }
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a valid port number, got: ${portRaw}`);
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    mediaBucketName,
    port,
  };
}
