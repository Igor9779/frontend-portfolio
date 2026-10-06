# Frontend Portfolio

Personal portfolio of **Igor Bondarenko**, Frontend Developer.

The portfolio showcases selected projects built with React, TypeScript, JavaScript, HTML and CSS, including web applications, developer tools, internal utilities and landing pages.

## Projects

### AI Radar

AI tools discovery platform powered by the FreeSerp API.

- Search and categories
- Sorting and pagination
- EN/UA localization
- URL-based state
- Responsive interface

**Tech:** React, TypeScript, Vite, Axios

- [Live Demo](https://ai-radar-rosy.vercel.app/)
- [GitHub](https://github.com/Igor9779/ai-radar)

---

### WoT Blitz Session Tracker

Node.js application for tracking World of Tanks Blitz session statistics using the official Wargaming API.

- Battle session tracking
- Session performance calculations
- SQLite storage
- Telegram bot integration
- REST API integration

**Tech:** Node.js, TypeScript, SQLite, Telegram, REST API

- [GitHub](https://github.com/Igor9779/wot-bliz-tracker)
- [Telegram Bot](https://t.me/blitz_session_tracker_bot)

---

### Deutsch Word App

React application for learning German vocabulary through a structured 30-day program.

- Daily vocabulary lists
- Pagination
- Bookmarks
- LocalStorage persistence
- Progress tracking

**Tech:** React, JavaScript, React Router, Vite, LocalStorage

- [Live Demo](https://deutch-word-app.vercel.app/)
- [GitHub](https://github.com/Igor9779/DeutchWordApp)

---

### Whites Generator

React-based internal tool for generating ready-to-use websites from reusable content sections.

- Single and multi-page generation
- Dynamic site configuration
- Random section selection
- ZIP export
- SEO files and assets generation

**Tech:** React, JavaScript, JSZip, Bootstrap, SEO

- [Live Demo](https://igor9779.github.io/whites-generator/)
- [GitHub](https://github.com/Igor9779/whites-generator)

---

### Domens Tools

Web toolkit for working with domain and content data.

- Text counter
- Duplicate and long-line detection
- JSON generation
- Persistent notepad
- Copy helpers
- Report handling through Vercel API

**Tech:** React, TypeScript, Vite, Axios, Vercel

- [Live Demo](https://domens-tools.vercel.app/)
- [GitHub](https://github.com/Igor9779/Domens-Tools)

---

### LivesTopAir

Responsive multi-page landing website with navigation, pricing and contact pages.

**Tech:** HTML, CSS, Bootstrap, JavaScript

- [View Project](public/projects/livestopair/)

---

### PagesMaxAir

Landing website for digital pages and templates focused on planning and organization.

**Tech:** HTML, CSS, JavaScript

- [View Project](public/projects/pagesmaxair/)

---

### WorksAllsDay

Landing website for digital workday structure and productivity templates.

**Tech:** HTML, CSS, JavaScript

- [View Project](public/projects/worksallsday/)

---

### PathsTopNow

Landing website presenting structured paths and productivity-oriented digital modules.

**Tech:** HTML, CSS, JavaScript

- [View Project](public/projects/pathstopnow/)

---

### WordsMaxLab

Landing website for a compact vocabulary-learning product with structured modules.

**Tech:** HTML, CSS, JavaScript

- [View Project](public/projects/wordsmaxlab/)

## Technologies Used in the Featured Projects

- HTML5
- CSS3
- JavaScript
- TypeScript
- React
- React Router
- Vite
- Node.js
- REST API
- Axios
- SQLite
- Telegram Bot API
- Bootstrap
- JSZip
- Git & GitHub

## Portfolio

The portfolio uses the **Next.js App Router**, **React**, **TypeScript**, **Tailwind CSS** and **Supabase**. Its homepage and reusable portfolio components are Server Components; only the error boundary uses a Client Component. ESLint checks the application and its configuration, and Next.js generates route types before the TypeScript check. The existing design, content, project order and responsive breakpoints at 760px and 480px are preserved.

It contains:

- Responsive project cards
- Project previews
- Live demo links
- GitHub links
- Telegram links
- Mobile-friendly layout
- CSS animations and hover effects

## Run Locally

Use Node.js 20.19+, 22.13+ or 24+ (Node.js 22.13+ recommended).

```bash
npm install
```

Create `.env.local` using the variable names in `.env.example`, then set the URL and publishable key from your Supabase project's settings locally. These two values are required:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Environment values must also be configured on the deployment host. Actual environment files are ignored by Git. The server validates configuration without logging values. No secret or service-role key is used.

Seed the existing `public.projects` table as described below before expecting the ten original cards, then run:

```bash
npm run dev
```

Next.js serves the development application at `http://localhost:3000`.

Check TypeScript and ESLint:

```bash
npm run typecheck
npm run lint
```

Build and start the production application:

```bash
npm run build
npm start
```

The production build is written to `.next/`, which is ignored by Git. Deploy with a Next.js-compatible host, or build and run `npm start` on a Node.js server. Keep `public/` alongside the application so the images and standalone demos remain available.

## Structure

```text
src/
  app/
    layout.tsx      Root layout, metadata, favicon and viewport
    page.tsx        Homepage; supplies project data to components
    error.tsx       Minimal error boundary with retry
    globals.css     Tailwind setup, base rules and appearance keyframes
    admin/page.tsx  Temporary CMS placeholder
    cms-demo/page.tsx  Temporary public demo placeholder
  components/       Hero, Projects, ProjectCard and Footer
  lib/
    projects.ts     Server-only query and database-to-UI mapping
    supabase/server.ts  Typed public-read client and environment validation
  types/project.ts  Project and link interfaces
  types/database.ts  Existing Supabase row schema and read-only client types
supabase/
  seed-projects.sql  One-time SQL seed for all ten original projects
  grant-projects-read.sql  SELECT-only repair for the observed permission failure
public/
  assets/           Original portfolio preview images
  projects/         Five unchanged standalone multi-page demos
  favicon.png
```

The five demo websites keep their original HTML, CSS/Bootstrap, JavaScript, SEO files and internal directory structures. Next.js serves them directly from `public/projects/` during development and production. `next.config.ts` rewrites their directory URLs to the existing `index.html` files and preserves the trailing slash so relative assets and navigation work. They are not React applications and do not inherit the portfolio's Tailwind styles.

Their browser URLs remain:

- `/projects/livestopair/`
- `/projects/pagesmaxair/`
- `/projects/worksallsday/`
- `/projects/pathstopnow/`
- `/projects/wordsmaxlab/`

The application currently uses root-relative URLs for local previews, demo links and the favicon. External project links and Unsplash previews retain their original URLs. Project previews use ordinary `<img>` elements to preserve their current sizing, cropping, responsive behavior and lazy loading without adding image-optimization configuration.

## Routes and Future CMS Work

- `/` — portfolio backed by the ten visible Supabase projects.
- `/admin` — temporary page: “Portfolio CMS — coming next.”
- `/cms-demo` — temporary page: “Portfolio CMS Demo — coming next.”

The two CMS routes contain placeholder text only and are excluded from search indexing. They are public at this stage; `/admin` will need authentication before real administrative functionality is added.

The homepage awaits `getProjects()` from `src/lib/projects.ts`, then passes frontend `Project` objects into `Projects`. `ProjectCard` receives each project through props and does not depend on Supabase. The server maps database column names to the existing card model and button labels. Only visible rows are selected, ordered by `position` ascending and then UUID `id` ascending for deterministic ties. RLS remains the database's access boundary.

The homepage renders on each incoming request using Next.js `connection()`, and the Supabase client's fetch uses `cache: 'no-store'`. No project results are persisted in Next.js's data cache or prerendered at build time. A fresh page request reflects database changes without rebuilding; an already-open page needs a refresh. Future caching and targeted revalidation can be added in the server data layer without changing the cards.

Empty results render “No projects to display yet.” Database failures throw a sanitized server error and show an error boundary with retry; there is no automatic fallback to local projects. Reads time out after ten seconds. Builds validate environment configuration and compile the integration but do not query the database.

Authentication, CMS operations, Storage, AI, GitHub imports and screenshot generation remain future work. No browser database client, API endpoint or mutation functionality is implemented. The client type intentionally disallows inserts and updates during this read-only stage.

## Seed the Existing Projects

The `public.projects` table and its visible-only SELECT policy must already exist. This repository does not alter the schema, RLS or policies.

The initial setup returned PostgreSQL `42501`, “permission denied for table projects.” This was resolved by executing `supabase/grant-projects-read.sql`, which grants only SELECT to the two roles covered by the existing policy, `anon` and `authenticated`. RLS still limits reads to visible rows, and no INSERT, UPDATE or DELETE access is granted. For a fresh environment with the same permission error, run that file in the SQL Editor before seeding. See [Supabase's permission error guidance](https://supabase.com/docs/guides/troubleshooting/database-api-42501-errors).

1. Open the Supabase SQL Editor for the intended project.
2. Paste the entire contents of `supabase/seed-projects.sql` and run it intentionally.
3. Confirm that the final result lists ten visible projects, in positions 0–9.
4. Refresh the portfolio and verify its ten cards against the seed contents.

The SQL was generated directly from the former `src/data/projects.ts`: titles, categories, full descriptions, previews, technologies, production/GitHub/Telegram links and visual order are preserved. `short_description` is NULL because the original cards have only one description. Each row has `source = 'manual'`; `github_repo` is derived as `owner/repository` when a GitHub repository link exists. Images stay in `public/assets/` or at their original external URLs, and demo links stay local.

The seed supplies fixed UUIDs and uses `ON CONFLICT (id) DO NOTHING`, relying on the table's UUID primary key. Repeating the same seed skips its existing rows without overwriting later edits. This protects against rerunning this file, but importing the same projects separately with different IDs could still create duplicates. The SQL runs in a transaction and explicitly supplies both timestamps; it contains no credentials and requires no application write policy.

The permission grant and seed have been executed. All ten visible rows and their frontend mapping have been verified against the original portfolio, including positions 0–9, descriptions, categories, technologies, previews and links. Supabase is the only production data source; the obsolete `src/data/projects.ts` has been removed. The migration SQL files remain as the record of the initial import and permission repair.
