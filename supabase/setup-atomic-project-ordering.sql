-- Stage 8: review, then execute manually in Supabase SQL Editor.
-- Defines one RPC; this migration does not call it or change any project rows.
-- Requires the existing administrator SELECT/UPDATE grants and RLS policies.
-- The RPC changes only position, including hidden projects; no temporary
-- positions, schema/index/policy changes or additional table grants are needed.

BEGIN;

CREATE OR REPLACE FUNCTION public.reorder_projects(
  ordered_ids uuid[],
  expected_order uuid[]
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog
SET row_security = on
AS $$
DECLARE
  caller_id uuid := auth.uid();
  project_count integer;
  current_order uuid[];
  affected_rows bigint;
BEGIN
  -- Authorize independently of Next.js, before acquiring a table lock.
  IF caller_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users AS membership
    WHERE membership.user_id = caller_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required.';
  END IF;

  IF ordered_ids IS NULL OR expected_order IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid project order.';
  END IF;

  project_count := cardinality(ordered_ids);
  IF cardinality(expected_order) <> project_count
    OR (project_count > 0 AND (
      array_ndims(ordered_ids) IS DISTINCT FROM 1
      OR array_lower(ordered_ids, 1) IS DISTINCT FROM 1
      OR array_ndims(expected_order) IS DISTINCT FROM 1
      OR array_lower(expected_order, 1) IS DISTINCT FROM 1
    )) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid project order.';
  END IF;

  -- uuid[] arguments enforce UUID syntax. Validate both lists independently.
  IF EXISTS (SELECT 1 FROM unnest(ordered_ids) AS item(id) WHERE item.id IS NULL)
    OR EXISTS (SELECT 1 FROM unnest(expected_order) AS item(id) WHERE item.id IS NULL)
    OR (SELECT count(DISTINCT item.id) FROM unnest(ordered_ids) AS item(id)) <> project_count
    OR (SELECT count(DISTINCT item.id) FROM unnest(expected_order) AS item(id)) <> project_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid project order.';
  END IF;

  -- PostgREST defaults to READ COMMITTED. Reject older transaction snapshots
  -- so the authoritative read after waiting for the lock sees committed writes.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = '25000', MESSAGE = 'Unable to save project order.';
  END IF;

  -- Blocks ROW EXCLUSIVE locks taken by INSERT/UPDATE/DELETE and serializes
  -- reorder calls. ACCESS SHARE used by ordinary SELECT remains compatible.
  -- SHARE alone permits concurrent readers-to-writers to deadlock on upgrade.
  -- The existing table-level UPDATE grant permits this lock for the invoker.
  LOCK TABLE public.projects IN SHARE ROW EXCLUSIVE MODE;

  -- Administrator SELECT RLS exposes the complete set, including hidden rows.
  SELECT coalesce(array_agg(project.id ORDER BY project.position, project.id), ARRAY[]::uuid[])
  INTO current_order
  FROM public.projects AS project;

  -- Cardinality plus duplicate checks and bidirectional containment establish
  -- exact set equality. Empty lists are valid only for a genuinely empty table.
  IF cardinality(current_order) <> project_count
    OR NOT (ordered_ids @> current_order AND ordered_ids <@ current_order) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Project list changed. Refresh and try again.';
  END IF;

  -- Detect stale order even if all IDs still exist. Never silently merge drafts.
  IF expected_order IS DISTINCT FROM current_order THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Project order changed. Refresh and try again.';
  END IF;

  UPDATE public.projects AS project
  SET position = (requested.ordinality - 1)::integer
  FROM unnest(ordered_ids) WITH ORDINALITY AS requested(id, ordinality)
  WHERE project.id = requested.id;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> project_count THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Unable to save project order.';
  END IF;

  -- A skipped RLS row or unexpected final mapping must abort the entire call.
  IF (SELECT count(*) FROM public.projects) <> project_count OR EXISTS (
    SELECT 1
    FROM unnest(ordered_ids) WITH ORDINALITY AS requested(id, ordinality)
    LEFT JOIN public.projects AS project ON project.id = requested.id
    WHERE project.id IS NULL
      OR project.position IS DISTINCT FROM (requested.ordinality - 1)::integer
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Unable to save project order.';
  END IF;
  -- No exception handler: any failure propagates and rolls back the RPC.
END;
$$;

-- Remove public/default API-role execution; grant only authenticated execution.
-- Administrator membership and existing project RLS still authorize each call.
REVOKE EXECUTE ON FUNCTION public.reorder_projects(uuid[], uuid[]) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_projects(uuid[], uuid[]) TO authenticated;

COMMIT;
