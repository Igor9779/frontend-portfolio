-- The public-read query returned 42501: permission denied for table projects.
-- Execute manually in Supabase SQL Editor before seeding/verifying the portfolio.
-- A SELECT policy also requires the corresponding table privilege.
-- Existing visible-only RLS and policies remain unchanged; no writes are granted.

GRANT SELECT ON TABLE public.projects TO anon, authenticated;
