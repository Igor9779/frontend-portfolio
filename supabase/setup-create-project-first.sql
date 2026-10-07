-- Review, then execute manually in Supabase SQL Editor.
-- Defines one RPC; applying this file never calls it or changes project rows.
-- Existing table grants, RLS, indexes, reorder_projects and Storage are unchanged.
-- The server supplies a generated project UUID and validated editable fields;
-- position and timestamps are determined entirely inside PostgreSQL.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.projects'::regclass AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.admin_users'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Existing project and administrator RLS must be enabled. No changes applied.';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.projects', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'public.projects', 'INSERT')
    OR NOT has_table_privilege('authenticated', 'public.projects', 'UPDATE')
    OR NOT has_table_privilege('authenticated', 'public.admin_users', 'SELECT') THEN
    RAISE EXCEPTION 'Existing authenticated project and membership grants are required. No changes applied.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_first(
  p_project_id uuid,
  p_title text,
  p_category text,
  p_short_description text,
  p_description text,
  p_preview_url text,
  p_github_url text,
  p_production_url text,
  p_telegram_url text,
  p_technologies text[],
  p_visible boolean,
  p_source text,
  p_github_repo text
)
RETURNS public.projects
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog
SET row_security = on
AS $$
DECLARE
  caller_id uuid := auth.uid();
  existing_order uuid[];
  final_order uuid[];
  existing_count integer;
  affected_rows bigint;
  normalized_repo text := nullif(lower(btrim(p_github_repo)), '');
  created_project public.projects%ROWTYPE;
BEGIN
  -- Check membership independently of Next.js, using caller privileges and RLS.
  IF caller_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users AS membership
    WHERE membership.user_id = caller_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required.';
  END IF;

  -- Explicit arguments exclude arbitrary positions and client timestamps.
  -- The Server Action remains responsible for URL and preview-file validation.
  IF p_project_id IS NULL
    OR p_title IS NULL OR btrim(p_title) = '' OR length(btrim(p_title)) > 160
    OR p_category IS NULL OR btrim(p_category) = '' OR length(btrim(p_category)) > 120
    OR p_description IS NULL OR btrim(p_description) = '' OR length(btrim(p_description)) > 10000
    OR length(btrim(p_short_description)) > 500
    OR length(btrim(p_preview_url)) > 2048
    OR length(btrim(p_github_url)) > 2048
    OR length(btrim(p_production_url)) > 2048
    OR length(btrim(p_telegram_url)) > 2048
    OR p_visible IS NULL
    OR p_source IS NULL OR p_source NOT IN ('manual', 'github')
    OR (normalized_repo IS NOT NULL AND (
      length(normalized_repo) > 200
      OR normalized_repo !~ '^[a-z0-9-]+/[a-z0-9_.-]+$'
      OR split_part(normalized_repo, '/', 2) IN ('.', '..')
      OR nullif(btrim(p_github_url), '') IS NULL
    ))
    OR (p_source = 'github' AND normalized_repo IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid project details.';
  END IF;

  IF p_technologies IS NULL OR cardinality(p_technologies) > 30
    OR (cardinality(p_technologies) > 0 AND (
      array_ndims(p_technologies) IS DISTINCT FROM 1
      OR array_lower(p_technologies, 1) IS DISTINCT FROM 1
    )) OR EXISTS (
      SELECT 1 FROM unnest(p_technologies) AS technology(value)
      WHERE technology.value IS NULL OR btrim(technology.value) = ''
        OR length(btrim(technology.value)) > 50
        OR technology.value ~ '[[:cntrl:]]'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid project details.';
  END IF;

  -- Read after acquiring the lock must see commits from any preceding writer.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = '25000', MESSAGE = 'Unable to save the project.';
  END IF;

  -- Conflicts with INSERT/UPDATE/DELETE and reorder_projects' identical lock;
  -- ordinary SELECT remains allowed. Existing UPDATE privileges permit it.
  LOCK TABLE public.projects IN SHARE ROW EXCLUSIVE MODE;

  SELECT coalesce(array_agg(project.id ORDER BY project.position, project.id), ARRAY[]::uuid[])
  INTO existing_order
  FROM public.projects AS project;
  existing_count := cardinality(existing_order);

  IF existing_count >= 2147483647 OR EXISTS (
    SELECT 1 FROM public.projects AS project WHERE project.id = p_project_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unable to save the project.';
  END IF;

  -- Recheck under the same lock to close concurrent-create duplicate races.
  -- Exact case-insensitive comparison also matches the original mixed-case seed.
  IF normalized_repo IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE lower(btrim(project.github_repo)) = normalized_repo
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'This GitHub repository has already been added.';
  END IF;

  -- All projects, including hidden ones, retain their previous relative order.
  -- Only position changes; old timestamps, content and previews are untouched.
  UPDATE public.projects AS project
  SET position = previous.ordinality::integer
  FROM unnest(existing_order) WITH ORDINALITY AS previous(id, ordinality)
  WHERE project.id = previous.id;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> existing_count THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Unable to save the project.';
  END IF;

  INSERT INTO public.projects (
    id, title, category, short_description, description, preview_url,
    github_url, production_url, telegram_url, technologies,
    position, visible, source, github_repo, created_at, updated_at
  ) VALUES (
    p_project_id, btrim(p_title), btrim(p_category), nullif(btrim(p_short_description), ''),
    btrim(p_description), nullif(btrim(p_preview_url), ''),
    nullif(btrim(p_github_url), ''), nullif(btrim(p_production_url), ''),
    nullif(btrim(p_telegram_url), ''),
    ARRAY(SELECT btrim(technology.value)
      FROM unnest(p_technologies) WITH ORDINALITY AS technology(value, ordinality)
      ORDER BY technology.ordinality),
    0, p_visible, p_source, normalized_repo, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  RETURNING * INTO created_project;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 OR created_project.id IS DISTINCT FROM p_project_id
    OR created_project.position IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Unable to save the project.';
  END IF;

  -- Verify the complete ID-to-position mapping, not merely a count or maximum.
  -- This proves exact 0..N positions, including the genuinely empty-table case.
  final_order := array_prepend(p_project_id, existing_order);
  IF (SELECT count(*) FROM public.projects) <> existing_count::bigint + 1 OR EXISTS (
    SELECT 1
    FROM unnest(final_order) WITH ORDINALITY AS expected(id, ordinality)
    LEFT JOIN public.projects AS project ON project.id = expected.id
    WHERE project.id IS NULL
      OR project.position IS DISTINCT FROM (expected.ordinality - 1)::integer
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Unable to save the project.';
  END IF;

  RETURN created_project;
  -- No exception handler: failures propagate and roll back insertion and shifts.
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_project_first(
  uuid, text, text, text, text, text, text, text, text, text[], boolean, text, text
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_project_first(
  uuid, text, text, text, text, text, text, text, text, text[], boolean, text, text
) TO authenticated;

COMMIT;
