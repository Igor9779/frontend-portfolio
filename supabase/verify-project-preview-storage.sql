-- Stage 7 live checkpoint: run after the browser replaces the hidden
-- CMS Storage Test preview, BEFORE it deletes that temporary project.
-- Read-only checks of bucket configuration, installed policies, membership,
-- API-role policy predicates and SELECT access to the existing test object.
-- No INSERT, UPDATE or DELETE statement targets Storage tables. Supabase
-- prohibits direct metadata deletion; all real file operations use its API.
-- Predicate checks complement live API tests; they are not API requests.
-- No user, membership, original project, policy or grant is changed.
-- This transaction must finish with ROLLBACK, never COMMIT.

BEGIN READ ONLY;

DO $$
DECLARE fixture_id uuid; object_name text; object_id uuid; object_row jsonb;
BEGIN
  IF (SELECT count(*) FROM public.projects) <> 11
    OR (SELECT count(*) FROM public.projects WHERE title = 'CMS Storage Test' AND NOT visible) <> 1 THEN
    RAISE EXCEPTION 'Run only at the hidden Storage test checkpoint (ten originals plus one temporary project).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_users) THEN
    RAISE EXCEPTION 'Existing administrator membership is required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-previews'
    AND public AND file_size_limit = 5242880
    AND allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
    AND allowed_mime_types <@ ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]) THEN
    RAISE EXCEPTION 'Expected public preview bucket configuration is missing.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'storage.objects'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'Storage RLS must remain enabled.';
  END IF;

  SELECT id, split_part(preview_url, '/project-previews/', 2)
    INTO fixture_id, object_name FROM public.projects WHERE title = 'CMS Storage Test';
  IF object_name !~ ('^projects/' || fixture_id::text || '/preview-[0-9a-f-]{36}[.]webp$') THEN
    RAISE EXCEPTION 'Expected replacement WebP path is missing.';
  END IF;
  SELECT id INTO object_id FROM storage.objects WHERE bucket_id = 'project-previews' AND name = object_name;
  IF object_id IS NULL OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'project-previews') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly the replacement object; inspect earlier test cleanup first.';
  END IF;

  PERFORM set_config('stage7.object_id', object_id::text, true);
  SELECT to_jsonb(o) INTO object_row FROM storage.objects o WHERE id = object_id;
  PERFORM set_config('stage7.object_row', object_row::text, true);

  -- RLS policies combine permissive rules with OR. Refuse unknown write rules
  -- instead of assuming the three named policies are the entire boundary.
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')) <> 2
    OR (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND permissive = 'PERMISSIVE' AND roles = ARRAY['authenticated']::name[]
      AND ((policyname = 'cms_previews_admin_select' AND cmd = 'SELECT' AND qual IS NOT NULL)
        OR (policyname = 'cms_previews_admin_insert' AND cmd = 'INSERT' AND with_check IS NOT NULL)
        OR (policyname = 'cms_previews_admin_delete' AND cmd = 'DELETE' AND qual IS NOT NULL))) <> 3 THEN
    RAISE EXCEPTION 'Unexpected Storage policy configuration. Review scope without changing unrelated policies.';
  END IF;
  IF NOT has_table_privilege('authenticated', 'storage.objects', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'storage.objects', 'INSERT')
    OR NOT has_table_privilege('authenticated', 'storage.objects', 'DELETE') THEN
    RAISE EXCEPTION 'Required existing Storage API privileges are missing.';
  END IF;
  PERFORM set_config('stage7.insert_check', (SELECT with_check FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cms_previews_admin_insert'), true);
  PERFORM set_config('stage7.delete_check', (SELECT qual FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cms_previews_admin_delete'), true);
  PERFORM set_config('stage7.select_check', (SELECT qual FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cms_previews_admin_select'), true);
  PERFORM set_config('stage7.admin_id', (SELECT user_id::text FROM public.admin_users ORDER BY user_id LIMIT 1), true);
  PERFORM set_config('stage7.non_admin_id', gen_random_uuid()::text, true);
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = current_setting('stage7.non_admin_id')::uuid) THEN
    RAISE EXCEPTION 'Unexpected UUID collision. Rerun verification.';
  END IF;
  PERFORM set_config('stage7.original_projects', (SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM public.projects p), true);
  PERFORM set_config('stage7.original_objects', (SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY id), '[]'::jsonb)::text FROM storage.objects o), true);
END;
$$;

-- Evaluate the actual installed predicates against a copied row value.
-- jsonb_populate_record creates a SELECT-only value, not a Storage row/write.
-- Membership subqueries still run with each role's real admin_users RLS.
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  -- Every installed write policy targets authenticated, established above.
  -- Anonymous callers must not inherit that role. Do not evaluate their
  -- inapplicable membership expressions: anon cannot SELECT admin_users.
  IF pg_has_role(current_user, 'authenticated', 'MEMBER') THEN
    RAISE EXCEPTION 'Anonymous role unexpectedly inherits authenticated access.';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE id = current_setting('stage7.object_id')::uuid) THEN
    RAISE EXCEPTION 'Anonymous caller unexpectedly has object metadata SELECT access.';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE operation text; permitted boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('stage7.non_admin_id'), 'role', 'authenticated')::text, true);
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Non-administrator unexpectedly has membership.';
  END IF;
  FOREACH operation IN ARRAY ARRAY['insert', 'delete', 'select'] LOOP
    EXECUTE format('SELECT coalesce((%s), false) FROM jsonb_populate_record(NULL::storage.objects, $1::jsonb) AS objects',
      current_setting('stage7.' || operation || '_check'))
      INTO permitted USING current_setting('stage7.object_row');
    IF permitted THEN RAISE EXCEPTION 'Non-administrator % predicate unexpectedly authorizes this object.', operation; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE id = current_setting('stage7.object_id')::uuid) THEN
    RAISE EXCEPTION 'Non-administrator unexpectedly has object metadata SELECT access.';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('stage7.admin_id'), 'role', 'authenticated')::text, true);
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Administrator membership read is unavailable.';
  END IF;
  FOREACH operation IN ARRAY ARRAY['insert', 'delete', 'select'] LOOP
    EXECUTE format('SELECT coalesce((%s), false) FROM jsonb_populate_record(NULL::storage.objects, $1::jsonb) AS objects',
      current_setting('stage7.' || operation || '_check'))
      INTO permitted USING current_setting('stage7.object_row');
    IF NOT permitted THEN RAISE EXCEPTION 'Administrator % predicate does not authorize this object.', operation; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE id = current_setting('stage7.object_id')::uuid) THEN
    RAISE EXCEPTION 'Administrator cannot SELECT the replacement object.';
  END IF;
END;
$$;

RESET ROLE;
DO $$
BEGIN
  IF (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.projects p)
    IS DISTINCT FROM current_setting('stage7.original_projects')::jsonb
    OR (SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY id), '[]'::jsonb) FROM storage.objects o)
    IS DISTINCT FROM current_setting('stage7.original_objects')::jsonb THEN
    RAISE EXCEPTION 'Unexpected project or Storage metadata change. Roll back; never commit this test.';
  END IF;
END;
$$;

ROLLBACK;

-- If an error interrupts execution, run ROLLBACK separately before retrying.
SELECT 'PASS: read-only role/policy checks; administrator metadata read; replacement cleanup; unchanged rows and Storage metadata.' AS verification,
  (SELECT count(*) FROM public.projects) AS checkpoint_project_count,
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'project-previews') AS replacement_object_count;
