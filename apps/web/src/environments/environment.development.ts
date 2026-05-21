export const environment = {
  production: false,
  i18n: {
    enableLegacyDomFallback: true,
  },
  supabase: {
    cloud: {
      url: 'https://yvvzbpnoesxlzlbomlkv.supabase.co',
      anonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dnpicG5vZXN4bHpsYm9tbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzE5MDQsImV4cCI6MjA4NzU0NzkwNH0.eb3kiKrhT4yFS0Jb5mYEyHIaSjVbyrdqOOplt-FqkH4',
    },
    /** Standard Supabase CLI local stack (see `supabase status`). */
    local: {
      url: 'http://127.0.0.1:54321',
      anonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    },
  },
};
