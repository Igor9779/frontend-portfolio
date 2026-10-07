-- SELECT-only inspection after the migration is manually applied.
-- Never invokes reorder_projects; no data, Storage, permissions or schema change.
-- Configuration inspection is not a live atomicity/concurrency test.

SELECT
  function.oid::regprocedure AS rpc_signature,
  function.proargnames AS argument_names,
  pg_get_function_result(function.oid) AS result_type,
  NOT function.prosecdef AS security_invoker,
  function.provolatile = 'v' AS is_volatile,
  function.proconfig AS function_settings,
  pg_get_functiondef(function.oid) AS definition
FROM pg_proc AS function
WHERE function.oid = to_regprocedure('public.reorder_projects(uuid[],uuid[])');

WITH target AS (
  SELECT to_regprocedure('public.reorder_projects(uuid[],uuid[])') AS oid
)
SELECT
  target.oid IS NOT NULL AS rpc_exists,
  has_function_privilege('anon', target.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', target.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', target.oid, 'EXECUTE') AS service_role_can_execute,
  EXISTS (
    SELECT 1
    FROM pg_proc AS function,
      LATERAL aclexplode(coalesce(function.proacl, acldefault('f', function.proowner))) AS permission
    WHERE function.oid = target.oid
      AND permission.grantee = 0 AND permission.privilege_type = 'EXECUTE'
  ) AS public_can_execute
FROM target;

-- Show all explicit execute grants, including inherent/owner administration.
SELECT
  CASE WHEN permission.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(permission.grantee) END AS grantee,
  permission.privilege_type,
  permission.is_grantable
FROM pg_proc AS function,
  LATERAL aclexplode(coalesce(function.proacl, acldefault('f', function.proowner))) AS permission
WHERE function.oid = to_regprocedure('public.reorder_projects(uuid[],uuid[])')
  AND permission.privilege_type = 'EXECUTE'
ORDER BY grantee;

SELECT
  has_table_privilege('authenticated', 'public.projects', 'SELECT') AS authenticated_can_select,
  has_table_privilege('authenticated', 'public.projects', 'UPDATE') AS authenticated_can_update,
  has_table_privilege('authenticated', 'public.admin_users', 'SELECT') AS authenticated_can_check_membership,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.projects'::regclass) AS projects_rls_enabled,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_users'::regclass) AS membership_rls_enabled;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('projects', 'admin_users')
ORDER BY tablename, policyname;

-- SQL Editor can inspect hidden projects too. No RPC is called here.
SELECT id, title, position, visible
FROM public.projects
ORDER BY position, id;

SELECT
  count(*) AS project_count,
  count(DISTINCT position) AS distinct_position_count,
  coalesce(bool_and(position = expected_position), true) AS positions_are_normalized
FROM (
  SELECT position, row_number() OVER (ORDER BY position, id) - 1 AS expected_position
  FROM public.projects
) AS ordered_projects;
