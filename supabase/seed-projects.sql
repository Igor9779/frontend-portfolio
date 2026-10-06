-- One-time migration from the former src/data/projects.ts; execute manually in Supabase SQL Editor.
-- Exactly 10 projects, preserving source content, links and visual order (positions 0-9).
-- Fixed IDs make reruns safe: existing rows are skipped, never overwritten.
-- Requires the existing id primary key; no schema, RLS or policy changes are made.
-- No credentials, application write permissions or service-role key are required.

BEGIN;

INSERT INTO public.projects (
  id, title, category, short_description, description, preview_url,
  github_url, production_url, telegram_url, technologies,
  position, visible, source, github_repo, created_at, updated_at
)
VALUES
  (
    '6dc6783d-f730-5c9b-8de8-a437f1b75412',
    'AI Radar',
    'AI TOOLS DIRECTORY',
    NULL,
    'AI tools discovery platform powered by the FreeSerp API with search, categories, sorting, pagination and EN/UA localization.',
    '/assets/ai-radar.png',
    'https://github.com/Igor9779/ai-radar',
    'https://ai-radar-rosy.vercel.app/',
    NULL,
    ARRAY['React', 'TypeScript', 'Vite', 'Axios']::text[],
    0,
    true,
    'manual',
    'Igor9779/ai-radar',
    now(),
    now()
  ),
  (
    'a283d434-9e23-5d38-944e-dbf661854220',
    'WoT Blitz Session Tracker',
    'NODE.JS / TELEGRAM BOT',
    NULL,
    'Node.js application for tracking World of Tanks Blitz session statistics using the official Wargaming API. Tracks completed battles, calculates session performance and sends updates through a Telegram bot.',
    '/assets/wot.jpg',
    'https://github.com/Igor9779/wot-bliz-tracker',
    NULL,
    'https://t.me/blitz_session_tracker_bot',
    ARRAY['Node.js', 'TypeScript', 'SQLite', 'Telegram', 'REST API']::text[],
    1,
    true,
    'manual',
    'Igor9779/wot-bliz-tracker',
    now(),
    now()
  ),
  (
    '6f590764-f51a-54c3-bc18-924fc41c9172',
    'Deutsch Word App',
    'REACT / LANGUAGE LEARNING',
    NULL,
    'React application for learning German vocabulary through a structured 30-day program. Includes daily word lists, pagination, bookmarks with localStorage persistence and progress completion.',
    '/assets/deutch-word-app.png',
    'https://github.com/Igor9779/DeutchWordApp',
    'https://deutch-word-app.vercel.app/',
    NULL,
    ARRAY['React', 'JavaScript', 'React Router', 'Vite', 'LocalStorage']::text[],
    2,
    true,
    'manual',
    'Igor9779/DeutchWordApp',
    now(),
    now()
  ),
  (
    '182eb617-dd4a-5766-b956-dcfd0041c8bc',
    'Whites Generator',
    'REACT / SITE GENERATOR',
    NULL,
    'React-based internal tool for generating ready-to-use websites from reusable content sections. Supports single and multi-page generation, dynamic site configuration, random section selection and ZIP export with SEO files and assets.',
    '/assets/whites-generator.png',
    'https://github.com/Igor9779/whites-generator',
    'https://igor9779.github.io/whites-generator/',
    NULL,
    ARRAY['React', 'JavaScript', 'JSZip', 'Bootstrap', 'SEO']::text[],
    3,
    true,
    'manual',
    'Igor9779/whites-generator',
    now(),
    now()
  ),
  (
    '00b6f15b-8e03-569f-8179-453623133e6c',
    'Domens Tools',
    'REACT / DEVELOPER TOOLS',
    NULL,
    'Web toolkit for working with domain and content data. Includes a text counter with duplicate and long-line detection, JSON generation, persistent notepad, copy helpers and report handling through a Vercel API.',
    '/assets/domens-tools.png',
    'https://github.com/Igor9779/Domens-Tools',
    'https://domens-tools.vercel.app/',
    NULL,
    ARRAY['React', 'TypeScript', 'Vite', 'Axios', 'Vercel']::text[],
    4,
    true,
    'manual',
    'Igor9779/Domens-Tools',
    now(),
    now()
  ),
  (
    '9d56314d-0974-550e-831c-02c1c371d00d',
    'LivesTopAir',
    'MULTI-PAGE WEBSITE',
    NULL,
    'Responsive multi-page landing website with navigation, pricing and contact pages.',
    'https://images.unsplash.com/photo-1536078101718-d1e8a6f5672a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070',
    NULL,
    '/projects/livestopair/index.html',
    NULL,
    ARRAY['HTML', 'CSS', 'Bootstrap', 'JavaScript']::text[],
    5,
    true,
    'manual',
    NULL,
    now(),
    now()
  ),
  (
    '98fe7327-a851-56e6-8c7b-19710c48e5e0',
    'PagesMaxAir',
    'DIGITAL PRODUCT LANDING',
    NULL,
    'Landing website for digital pages and templates focused on clear planning and organization.',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=2070',
    NULL,
    '/projects/pagesmaxair/index.html',
    NULL,
    ARRAY['HTML', 'CSS', 'JavaScript']::text[],
    6,
    true,
    'manual',
    NULL,
    now(),
    now()
  ),
  (
    'e3b2fa07-b837-54cf-adac-fa1476d715a3',
    'WorksAllsDay',
    'PRODUCT LANDING',
    NULL,
    'Landing website for digital workday structure and productivity templates.',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2070&q=80',
    NULL,
    '/projects/worksallsday/index.html',
    NULL,
    ARRAY['HTML', 'CSS', 'JavaScript']::text[],
    7,
    true,
    'manual',
    NULL,
    now(),
    now()
  ),
  (
    'f7ae34b4-1d09-513c-a552-9b826e3cb7bb',
    'PathsTopNow',
    'PRODUCT LANDING',
    NULL,
    'Landing website presenting structured paths and productivity-oriented digital modules.',
    'https://images.unsplash.com/photo-1542744094-24638eff58bb?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2071',
    NULL,
    '/projects/pathstopnow/index.html',
    NULL,
    ARRAY['HTML', 'CSS', 'JavaScript']::text[],
    8,
    true,
    'manual',
    NULL,
    now(),
    now()
  ),
  (
    '5bc218da-d5ff-599e-a30d-91e320662882',
    'WordsMaxLab',
    'EDUCATIONAL LANDING',
    NULL,
    'Landing website for a compact vocabulary-learning product with structured modules.',
    '/assets/wordsmaxlab.png',
    NULL,
    '/projects/wordsmaxlab/index.html',
    NULL,
    ARRAY['HTML', 'CSS', 'JavaScript']::text[],
    9,
    true,
    'manual',
    NULL,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Inspect the complete visible portfolio; on an initially empty table this returns 10 rows.
SELECT id, title, position, visible
FROM public.projects
WHERE visible = true
ORDER BY position ASC, id ASC;
