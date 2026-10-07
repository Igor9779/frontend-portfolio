-- Stage 6, Phase A: execute this file manually in Supabase SQL Editor.
-- Adds only authenticated INSERT/UPDATE/DELETE privileges on public.projects
-- and three membership-based write policies. Existing SELECT policies, project
-- data, admin_users permissions and RLS settings are preserved.
-- Reruns replace only this migration's three write policies, in a transaction.

-- Inspect the existing policy catalog; application credentials cannot read it.
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('projects', 'admin_users')
ORDER BY tablename, policyname;

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
    RAISE EXCEPTION 'Existing projects and admin_users tables must have RLS enabled. No changes applied.';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.admin_users', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'public.projects', 'SELECT') THEN
    RAISE EXCEPTION 'Existing authenticated SELECT grants are required. Complete Stage 3/5 read grants first.';
  END IF;

  -- Permissive policies combine with OR. Fail instead of silently leaving an
  -- unknown broad write policy that could authorize non-administrators.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      AND policyname NOT IN ('cms_admin_insert_projects', 'cms_admin_update_projects', 'cms_admin_delete_projects')
  ) THEN
    RAISE EXCEPTION 'Unexpected existing projects write policies. Review them before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND (
        (policyname = 'cms_admin_insert_projects' AND cmd <> 'INSERT')
        OR (policyname = 'cms_admin_update_projects' AND cmd <> 'UPDATE')
        OR (policyname = 'cms_admin_delete_projects' AND cmd <> 'DELETE')
      )
  ) THEN
    RAISE EXCEPTION 'Reserved CMS policy names already have different operations. No existing policies were changed.';
  END IF;
END;
$$;

DROP POLICY IF EXISTS cms_admin_insert_projects ON public.projects;
CREATE POLICY cms_admin_insert_projects ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS cms_admin_update_projects ON public.projects;
CREATE POLICY cms_admin_update_projects ON public.projects
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS cms_admin_delete_projects ON public.projects;
CREATE POLICY cms_admin_delete_projects ON public.projects
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = (SELECT auth.uid())
  ));

-- Privileges permit authenticated requests; RLS independently requires admin
-- membership. Nothing is granted to anon or on public.admin_users.
GRANT INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;

COMMIT;

-- Verify the new policies and grants. No project rows are inserted/changed.
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'projects'
ORDER BY policyname;

SELECT role_name,
  has_table_privilege(role_name, 'public.projects', 'SELECT') AS can_select,
  has_table_privilege(role_name, 'public.projects', 'INSERT') AS can_insert,
  has_table_privilege(role_name, 'public.projects', 'UPDATE') AS can_update,
  has_table_privilege(role_name, 'public.projects', 'DELETE') AS can_delete
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name);
