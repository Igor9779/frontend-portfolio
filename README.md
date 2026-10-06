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

The portfolio uses the **Next.js App Router**, **React**, **TypeScript**, **Tailwind CSS** and **Supabase**. Its homepage and portfolio components are Server Components. The admin layout and data loading also run on the server; the CMS interactions and error boundary use Client Components. ESLint checks the application and its configuration, and Next.js generates route types before the TypeScript check. The existing public design, content, project order and responsive breakpoints at 760px and 480px are preserved.

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
    admin/(protected)/layout.tsx  Authorized CMS header and workspace
    admin/(protected)/page.tsx  Server-loaded, read-only CMS dashboard
    admin/login/page.tsx  Email/password administrator sign-in
    admin/actions.ts  Authentication-only sign-in and sign-out actions
    cms-demo/page.tsx  Temporary public demo placeholder
  components/       Hero, Projects, ProjectCard and Footer
    admin/          Project list, shared form, technology input and dialogs
  lib/
    projects.ts     Server-only query and database-to-UI mapping
    auth.ts         Verified identity and admin_users authorization
    supabase/public.ts  Anonymous portfolio client, independent of sessions
    supabase/server.ts  Per-request, cookie-based authenticated SSR client
    supabase/config.ts  Environment validation and shared client options
  proxy.ts          Next.js 16 admin session refresh
  types/project.ts  Project and link interfaces
  types/admin-project.ts  Management model with IDs, positions and form fields
  types/database.ts  Existing Supabase row schema and read-only client types
supabase/
  seed-projects.sql  One-time SQL seed for all ten original projects
  grant-projects-read.sql  SELECT-only repair for the observed permission failure
  grant-admin-users-read.sql  Authenticated SELECT-only membership grant repair
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
- `/admin` — responsive, read-only project management interface.
- `/admin/login` — private administrator sign-in; no registration.
- `/cms-demo` — temporary page: “Portfolio CMS Demo — coming next.”

The CMS routes are excluded from search indexing. The portfolio and `/cms-demo` are public. `/admin` requires Supabase Auth and membership in `public.admin_users`, and has no database mutation capability. `/cms-demo` remains a text-only placeholder.

The homepage awaits `getProjects()` from `src/lib/projects.ts`, then passes frontend `Project` objects into `Projects`. `ProjectCard` receives each project through props and does not depend on Supabase. The server maps database column names to the existing card model and button labels. Only visible rows are selected, ordered by `position` ascending and then UUID `id` ascending for deterministic ties. RLS remains the database's access boundary.

The homepage renders on each incoming request using Next.js `connection()`, and the Supabase client's fetch uses `cache: 'no-store'`. No project results are persisted in Next.js's data cache or prerendered at build time. A fresh page request reflects database changes without rebuilding; an already-open page needs a refresh. Future caching and targeted revalidation can be added in the server data layer without changing the cards.

Empty results render “No projects to display yet.” Database failures throw a sanitized server error and show an error boundary with retry; there is no automatic fallback to local projects. Reads time out after ten seconds. Builds validate environment configuration and compile the integration but do not query the database.

Persistent CMS operations, Storage, AI, GitHub imports and screenshot generation remain future work. No browser database client, API endpoint, project mutation Server Action or database write functionality is implemented. The client type intentionally disallows inserts and updates during this read-only stage. The only Server Actions handle authentication.

## Read-only CMS Interface (Stage 4)

`/admin` calls `getAdminProjects()` on the server and passes camelCase `AdminProject` objects into `AdminProjects`. Both queries share a single row-reading helper. Public `getProjects()` always uses an anonymous client and adds `visible = true`, even for a signed-in administrator. The admin query first calls `requireAdmin()`, then requests all projects with that user's authenticated client. Both queries use deterministic position/ID ordering and uncached fetching.

The existing administrator SELECT policy allows the authenticated dashboard to read both published and hidden projects. There is no privileged credential or policy change. The ten original projects remain published.

The interface includes:

- Immediate local search by title, category and technology, with a no-results state.
- Compact rows with previews, published/hidden status, positions, technologies and available project links.
- A shared Add/Edit dialog with all current project fields, technology chips and a local visibility toggle. Closing or cancelling discards the draft; Save is disabled.
- A delete confirmation whose final Delete action is disabled. No project is removed locally or remotely.
- Local Move Up/Down previews, an explicit preview notice and Reset order. Refreshing restores database order. Clear search before reordering so moves always correspond to the complete list.
- Native modal dialogs with focus containment, Escape/backdrop dismissal, focus restoration and scrollable forms on smaller viewports.

All project interactions are non-persistent. There are no INSERT, UPDATE or DELETE calls, write policies, service-role keys, mutation endpoints or project mutation Server Actions. `/cms-demo`, the public portfolio and the static demo files remain separate from the management interface.

Stage 6 CRUD must call `requireAdmin()` inside every Server Action, use the returned user-scoped Supabase client, establish appropriate administrator-only RLS/write privileges, define mutation types and server-side field/URL validation, refresh returned data after successful changes, and retain stable UUIDs. The layout alone is not an authorization boundary for actions. Ordering remains a local preview; it must not be treated as saved data.

## Administrator Authentication (Stage 5)

Authentication uses `@supabase/ssr` and SDK-managed cookies. Sign-in and sign-out run in Server Actions; credentials and tokens are never returned to components or logged. There is no browser Supabase client or localStorage session. Cookies are HttpOnly, SameSite=Lax and Secure in production. Use HTTPS for deployed production environments.

`src/proxy.ts` matches only `/admin/:path*` and calls `getClaims()` to refresh sessions before rendering. Refreshed cookies are copied to both the request and response; SDK cache headers are preserved, and admin responses use `Cache-Control: private, no-store`. Authenticated pages are dynamic and auth/project fetches are uncached.

`requireAdmin()` is shared by the protected route-group layout and `getAdminProjects()`. It verifies the current user with `getUser()` and selects that user's own `admin_users` row. Missing sessions redirect to `/admin/login`; authenticated non-members are denied, and verification errors fail closed with generic messages. Login repeats these checks after `signInWithPassword()` and signs out rejected sessions. An already authorized administrator visiting `/admin/login` is redirected to `/admin`.

Sign out uses Supabase's local scope to end the current session, removes its SDK cookies and redirects to `/admin/login`. Other devices are unaffected. Errors remain generic and allow retry.

Public registration is intentionally unavailable: there is no registration route, form or `signUp()` call. Administrators must be created manually in Supabase Auth and added manually to `public.admin_users`. The existing own-membership and administrator project SELECT policies must already exist; this stage creates no tables, policies or project write permissions. `.env.example` remains limited to the URL and publishable key, with no privileged credentials.

An RLS SELECT policy also requires the underlying table SELECT privilege. If sign-in reports “Unable to verify access” and the server logs `Administrator membership lookup failed (42501)`, inspect and apply `supabase/grant-admin-users-read.sql` in the Supabase SQL Editor. It grants SELECT on `admin_users` only to `authenticated`, with no anonymous grant, write grant or RLS/policy change. Existing RLS still limits users to their own membership row. Diagnostics log only a sanitized code, never identities, credentials or raw database errors. See [Supabase's permission error guidance](https://supabase.com/docs/guides/troubleshooting/database-api-42501-errors).

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
