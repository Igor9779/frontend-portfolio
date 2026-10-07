-- Read-only final check AFTER the browser deletes CMS Storage Test.
-- The Stage 7 test is the only uploader to the newly configured preview bucket.
-- Never remove Storage metadata with SQL; cleanup uses the Storage API.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.projects) <> 10
    OR EXISTS (SELECT 1 FROM public.projects WHERE title = 'CMS Storage Test') THEN
    RAISE EXCEPTION 'Temporary project cleanup has not restored the original ten projects.';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'project-previews') THEN
    RAISE EXCEPTION 'Preview objects remain. Inspect API cleanup; do not delete Storage metadata with SQL.';
  END IF;
END;
$$;

SELECT 'PASS: exactly ten projects; zero temporary records or Storage objects.' AS verification,
  (SELECT count(*) FROM public.projects) AS final_project_count,
  (SELECT count(*) FROM public.projects WHERE title = 'CMS Storage Test') AS remaining_test_projects,
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'project-previews') AS remaining_storage_objects;
