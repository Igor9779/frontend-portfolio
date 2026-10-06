-- Run manually in Supabase SQL Editor if the authenticated membership lookup
-- returns 42501. The table and own-row SELECT RLS policy must already exist.
-- Only authenticated users receive SELECT; RLS still restricts each user to
-- their own membership row. No schema/policy changes or write grants are made.

-- Inspect the existing permission before applying the repair.
SELECT has_table_privilege('authenticated', 'public.admin_users', 'SELECT')
  AS authenticated_can_read_admin_membership;

BEGIN;

GRANT SELECT ON TABLE public.admin_users TO authenticated;

COMMIT;

SELECT
  has_table_privilege('authenticated', 'public.admin_users', 'SELECT')
    AS authenticated_can_read_admin_membership,
  has_schema_privilege('authenticated', 'public', 'USAGE')
    AS authenticated_can_use_public_schema;
