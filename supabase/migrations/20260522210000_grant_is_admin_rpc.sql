-- Allow authenticated clients to call is_admin() for org-admin UI gates.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
