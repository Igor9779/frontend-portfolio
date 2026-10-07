-- Stage 7, Phase A: execute manually in Supabase SQL Editor, then confirm.
-- Public reads; administrator-only new uploads and deletion. Replacements use
-- a new UUID path, so UPDATE/upsert access is deliberately not added.
-- No project rows, local assets, unrelated buckets or existing SELECT policies
-- are changed. Supabase's existing Storage table privileges are used as-is.

SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'storage.objects'::regclass AND relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.admin_users'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'Existing Storage and membership RLS must be enabled. No changes applied.';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.admin_users', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'storage.objects', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'storage.objects', 'INSERT')
    OR NOT has_table_privilege('authenticated', 'storage.objects', 'DELETE') THEN
    RAISE EXCEPTION 'Expected existing Supabase Storage/membership privileges are missing. Review configuration; no GRANT ALL or anonymous grants are applied.';
  END IF;

  -- Permissive policies combine with OR. Refuse unknown write policies rather
  -- than risking a broad existing policy authorizing writes to this new bucket.
  -- If other buckets already have write policies, review their scope first;
  -- this migration never drops or changes those unrelated policies.
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      AND policyname NOT IN ('cms_previews_admin_insert', 'cms_previews_admin_delete')
  ) THEN
    RAISE EXCEPTION 'Existing Storage write policies require scope review before setup. No unrelated policies were changed.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        (policyname = 'cms_previews_admin_select' AND cmd <> 'SELECT')
        OR (policyname = 'cms_previews_admin_insert' AND cmd <> 'INSERT')
        OR (policyname = 'cms_previews_admin_delete' AND cmd <> 'DELETE')
      )
  ) THEN
    RAISE EXCEPTION 'Reserved preview policy names have different operations. No changes applied.';
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-previews', 'project-previews', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- SELECT is required by the Storage deletion API. Public image URLs bypass
-- SELECT policies for downloads; no public listing/metadata policy is needed.
DROP POLICY IF EXISTS cms_previews_admin_select ON storage.objects;
CREATE POLICY cms_previews_admin_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-previews' AND EXISTS (
  SELECT 1 FROM public.admin_users WHERE admin_users.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS cms_previews_admin_insert ON storage.objects;
CREATE POLICY cms_previews_admin_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-previews'
  AND name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/preview-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
  AND EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS cms_previews_admin_delete ON storage.objects;
CREATE POLICY cms_previews_admin_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-previews'
  AND name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/preview-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
  AND EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = (SELECT auth.uid()))
);

COMMIT;

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'project-previews';
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname IN ('cms_previews_admin_select', 'cms_previews_admin_insert', 'cms_previews_admin_delete')
ORDER BY policyname;
