-- Grant admin to kleveta.matthias@gmail.com on local Supabase (idempotent).
-- Run: docker exec -i supabase_db_feldpost psql -U postgres -d postgres < scripts/promote-local-dev-admin.sql
--
-- After running: sign OUT in the app, hard-refresh, sign IN with the local password below.
-- Local auth user id differs from cloud — a cloud session on local Supabase shows "User" and hides admin settings.
-- In the browser console, confirm: [feldpost] Supabase: local (http://127.0.0.1:54321)
-- To use hosted data instead: localStorage.setItem('feldpost.supabase.target','cloud') then refresh and use your cloud password.

DO $$
DECLARE
  v_uid uuid;
  v_org_id uuid;
  v_role_admin uuid;
  v_email text := 'kleveta.matthias@gmail.com';
  v_password text := 'FeldpostLocal1!';
  v_full_name text := 'Matthias (local dev)';
BEGIN
  SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found — run supabase db reset first';
  END IF;

  SELECT id INTO v_role_admin FROM public.roles WHERE name = 'admin';
  IF v_role_admin IS NULL THEN
    RAISE EXCEPTION 'admin role missing in public.roles';
  END IF;

  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(v_email);

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();

    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      is_sso_user,
      is_anonymous
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
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      false,
      false
    );

    ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

    RAISE NOTICE 'Created auth user %', v_email;
  ELSE
    RAISE NOTICE 'User % already exists — repairing auth columns if needed', v_email;
  END IF;

  -- GoTrue cannot scan NULL into string fields (login error: "Database error querying schema").
  UPDATE auth.users
  SET
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    encrypted_password = CASE
      WHEN encrypted_password IS NULL OR encrypted_password = '' THEN crypt(v_password, gen_salt('bf'))
      ELSE encrypted_password
    END,
    email_confirmed_at = coalesce(email_confirmed_at, now())
  WHERE id = v_uid;

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    v_uid::text,
    v_uid,
    jsonb_build_object(
      'sub', v_uid::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1
    FROM auth.identities i
    WHERE i.user_id = v_uid AND i.provider = 'email'
  );

  INSERT INTO public.profiles (id, organization_id, full_name)
  VALUES (v_uid, v_org_id, v_full_name)
  ON CONFLICT (id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        full_name = EXCLUDED.full_name;

  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (v_uid, v_role_admin)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RAISE NOTICE 'Admin role granted for % (password: %)', v_email, v_password;
END $$;
