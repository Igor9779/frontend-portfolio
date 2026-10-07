-- Stage 6 verification: run manually in Supabase SQL Editor AFTER the live
-- browser test has deleted its temporary project and restored the original 10.
-- Uses one temporary CMS CRUD Test row in a rollback-only transaction.
-- No original project, schema, policy, grant or membership is modified.
-- The SQL Editor impersonates API roles only inside this transaction. This
-- tests PostgreSQL RLS, independently of the application/authentication checks.

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.projects) <> 10 THEN
    RAISE EXCEPTION 'Expected exactly the original 10 projects. Finish temporary-project cleanup first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_users) THEN
    RAISE EXCEPTION 'An existing administrator membership is required.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE title IN ('CMS CRUD Test', 'CMS CRUD Test Updated')) THEN
    RAISE EXCEPTION 'A browser verification project still exists. Clean it up first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.projects'::regclass AND relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.admin_users'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'RLS must remain enabled on both tables.';
  END IF;
  IF has_table_privilege('anon', 'public.projects', 'INSERT')
    OR has_table_privilege('anon', 'public.projects', 'UPDATE')
    OR has_table_privilege('anon', 'public.projects', 'DELETE') THEN
    RAISE EXCEPTION 'Anonymous write privileges must be absent.';
  END IF;
END;
$$;

-- These custom settings are transaction-local and contain no credentials.
SELECT set_config('stage6.original_rows',
  (SELECT jsonb_agg(to_jsonb(projects) ORDER BY id)::text FROM public.projects), true);
SELECT set_config('stage6.fixture_id', gen_random_uuid()::text, true);
SELECT set_config('stage6.admin_id',
  (SELECT user_id::text FROM public.admin_users ORDER BY user_id LIMIT 1), true);
SELECT set_config('stage6.non_admin_id', gen_random_uuid()::text, true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = current_setting('stage6.non_admin_id')::uuid) THEN
    RAISE EXCEPTION 'Unexpected test UUID collision. Rerun the transaction.';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('stage6.admin_id'), 'role', 'authenticated')::text, true);

DO $$
DECLARE affected integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Administrator cannot read their own membership.';
  END IF;
  INSERT INTO public.projects (
    id, title, category, short_description, description, preview_url,
    github_url, production_url, telegram_url, technologies, position,
    visible, source, github_repo, created_at, updated_at
  ) VALUES (
    current_setting('stage6.fixture_id')::uuid, 'CMS CRUD Test', 'CMS VERIFICATION',
    NULL, 'Rollback-only RLS verification project.', NULL, NULL, NULL, NULL,
    ARRAY['TypeScript']::text[], 10, false, 'manual', NULL, now(), now()
  );
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = current_setting('stage6.fixture_id')::uuid AND visible = false) THEN
    RAISE EXCEPTION 'Administrator hidden-project SELECT failed.';
  END IF;
  UPDATE public.projects SET description = 'Admin update verified.'
  WHERE id = current_setting('stage6.fixture_id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Administrator UPDATE failed.'; END IF;
END;
$$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = current_setting('stage6.fixture_id')::uuid) THEN
    RAISE EXCEPTION 'Anonymous caller can read a hidden project.';
  END IF;
  BEGIN
    INSERT INTO public.projects (id, title, category, description, technologies, position, visible, source, created_at, updated_at)
    VALUES (current_setting('stage6.fixture_id')::uuid, 'CMS CRUD Test', 'CMS VERIFICATION',
      'Unauthorized INSERT probe.', ARRAY[]::text[], 10, false, 'manual', now(), now());
    RAISE EXCEPTION 'Anonymous INSERT unexpectedly succeeded.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.projects SET title = 'CMS CRUD Test Updated' WHERE id = current_setting('stage6.fixture_id')::uuid;
    RAISE EXCEPTION 'Anonymous UPDATE unexpectedly permitted.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.projects WHERE id = current_setting('stage6.fixture_id')::uuid;
    RAISE EXCEPTION 'Anonymous DELETE unexpectedly permitted.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('stage6.non_admin_id'), 'role', 'authenticated')::text, true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Non-administrator unexpectedly has membership.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = current_setting('stage6.fixture_id')::uuid) THEN
    RAISE EXCEPTION 'Non-administrator can read a hidden project.';
  END IF;
  BEGIN
    INSERT INTO public.projects (id, title, category, description, technologies, position, visible, source, created_at, updated_at)
    VALUES (current_setting('stage6.fixture_id')::uuid, 'CMS CRUD Test', 'CMS VERIFICATION',
      'Unauthorized INSERT probe.', ARRAY[]::text[], 10, false, 'manual', now(), now());
    RAISE EXCEPTION 'Non-administrator INSERT unexpectedly succeeded.';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- Publish ONLY inside this uncommitted transaction so UPDATE/DELETE denials
-- also test a row non-administrators can SELECT. Other connections never see
-- this fixture; the transaction ends with ROLLBACK.
SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('stage6.admin_id'), 'role', 'authenticated')::text, true);
UPDATE public.projects SET visible = true WHERE id = current_setting('stage6.fixture_id')::uuid;

SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('stage6.non_admin_id'), 'role', 'authenticated')::text, true);

DO $$
DECLARE affected integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = current_setting('stage6.fixture_id')::uuid AND visible = true) THEN
    RAISE EXCEPTION 'Non-administrator visible-project SELECT failed.';
  END IF;
  UPDATE public.projects SET title = 'CMS CRUD Test Updated' WHERE id = current_setting('stage6.fixture_id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'RLS permitted non-administrator UPDATE.'; END IF;
  DELETE FROM public.projects WHERE id = current_setting('stage6.fixture_id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'RLS permitted non-administrator DELETE.'; END IF;
END;
$$;

SELECT set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('stage6.admin_id'), 'role', 'authenticated')::text, true);

DO $$
DECLARE affected integer;
BEGIN
  DELETE FROM public.projects WHERE id = current_setting('stage6.fixture_id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Administrator DELETE failed.'; END IF;
END;
$$;

RESET ROLE;

DO $$
BEGIN
  IF (SELECT jsonb_agg(to_jsonb(projects) ORDER BY id) FROM public.projects)
    IS DISTINCT FROM current_setting('stage6.original_rows')::jsonb THEN
    RAISE EXCEPTION 'The original project rows changed during verification.';
  END IF;
END;
$$;

ROLLBACK;

-- Any failed assertion aborts the transaction. If your SQL Editor stops before
-- ROLLBACK on an error, run ROLLBACK separately; never COMMIT this test.
SELECT 'PASS: admin CRUD, anonymous denial, non-admin RLS denial, hidden-row protection and unchanged originals.' AS verification,
  count(*) AS final_project_count,
  count(*) FILTER (WHERE title IN ('CMS CRUD Test', 'CMS CRUD Test Updated')) AS remaining_test_projects
FROM public.projects;
