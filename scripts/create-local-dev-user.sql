-- Bootstrap one local dev user (bypasses invite-only trigger).
-- Email: kleveta.matthias@gmail.com  Password: FeldpostLocal1!
-- Run from repo root:
--   docker exec -i supabase_db_feldpost psql -U postgres -d postgres < scripts/create-local-dev-user.sql

DO $$
DECLARE
  v_uid uuid := gen_random_uuid();
  v_org_id uuid;
  v_role_admin uuid;
  v_email text := 'kleveta.matthias@gmail.com';
  v_password text := 'FeldpostLocal1!';
  v_full_name text := 'Matthias (local dev)';
BEGIN
  SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found — run migrations/seed first';
  END IF;

  SELECT id INTO v_role_admin FROM public.roles WHERE name = 'admin';

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(v_email)) THEN
    RAISE NOTICE 'User % already exists — skipping auth insert', v_email;
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(v_email);
  ELSE
    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      now(), now(), '', ''
    );

    ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
    RAISE NOTICE 'Created auth user % (id %)', v_email, v_uid;
  END IF;

  INSERT INTO public.profiles (id, organization_id, full_name)
  VALUES (v_uid, v_org_id, v_full_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  IF v_role_admin IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_uid, v_role_admin)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    RAISE NOTICE 'Granted admin role';
  END IF;
END $$;
