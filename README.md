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

Use Node.js 22.17+ or 24+. Screenshot Chromium requires this minimum; configure the Vercel project to use Node 22.x or 24.x as well.

```bash
npm install
```

Create `.env.local` using the variable names in `.env.example`, then set the URL and publishable key from your Supabase project's settings locally. These two values are required:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Environment values must also be configured on the deployment host. Actual environment files are ignored by Git. The server validates configuration without logging values. Supabase access uses the publishable key and the user's session, with no service-role key. Optional administrator AI Auto-fill additionally uses the server-only `OPENAI_API_KEY`; the portfolio and ordinary CMS features work without it.

Seed the existing `public.projects` table as described below before expecting the ten original cards, then run:

```bash
npm run dev
```

Next.js serves the development application at `http://localhost:3000`.

Check TypeScript, ESLint and the validation/action tests:

```bash
npm run typecheck
npm run lint
npm test
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
    admin/(protected)/page.tsx  Server-loaded administrator CMS dashboard
    admin/login/page.tsx  Email/password administrator sign-in
    admin/actions.ts  Authentication-only sign-in and sign-out actions
    admin/project-actions.ts  Authorized create/update/delete Server Actions
    admin/order-actions.ts  Authorized atomic project-order Server Action
    admin/github-actions.ts  Authorized read-only GitHub metadata import
    admin/ai-actions.ts  Authorized AI suggestions; never saves project data
    admin/screenshot/route.ts  Authorized same-origin POST; pending JPEG only
    cms-demo/page.tsx  Public CMS demo; server-read visible project snapshot
  components/       Hero, Projects, ProjectCard and Footer
    admin/          Project list, shared form, technology input and dialogs
    demo/CmsDemo.tsx  Anonymous demo workspace with browser-local handlers
  lib/
    projects.ts     Server-only query and database-to-UI mapping
    project-validation.ts  Allowed fields, bounds, URLs and repository mapping
    github-repository.ts  Strict GitHub URL validation and normalized identity
    github-import.ts  Bounded server-only public GitHub metadata/language reads
    github-api.ts     Shared fixed-origin, streaming-limited GitHub transport
    github-context.ts  Bounded README/package evidence for AI suggestions
    ai-autofill.ts    Server-only OpenAI Responses integration and strict schema
    ai-evidence.ts    Conservative checks for explicit evidence contradictions
    ai-suggestions.ts  Five-field validation and neutral form merge
    github-projects.ts  Authenticated, case-insensitive duplicate lookup
    admin-project-draft.ts  Real Add Project tab draft serialization and recovery
    project-order.ts  Saved/draft ordering, control guards and ID validation
    cms-demo.ts      Local demo state, validated tab storage and blob lifetimes
    preview-file.ts  Shared size/type/signature validation
    pending-preview.ts  Manual/generated File state and object URL lifecycle
    screenshots/    Bounded capture, URL/IP checks and DNS-pinned CONNECT proxy
    preview-path.ts  Strict managed preview URL recognition
    project-previews.ts  Authorized server uploads and compensating cleanup
    auth.ts         Verified identity and admin_users authorization
    supabase/public.ts  Anonymous portfolio client, independent of sessions
    supabase/server.ts  Per-request, cookie-based authenticated SSR client
    supabase/config.ts  Environment validation and shared client options
  proxy.ts          Next.js 16 admin session refresh
  types/project.ts  Project and link interfaces
  types/admin-project.ts  Management model with IDs, positions and form fields
  types/project-form.ts  Form values, field errors and typed action results
  types/database.ts  Existing Supabase row schema and permitted mutation fields
supabase/
  seed-projects.sql  One-time SQL seed for all ten original projects
  grant-projects-read.sql  SELECT-only repair for the observed permission failure
  grant-admin-users-read.sql  Authenticated SELECT-only membership grant repair
  grant-admin-project-writes.sql  Administrator write policies and table grants
  verify-admin-project-writes.sql  Rollback-only database authorization checks
  setup-project-preview-storage.sql  Public preview bucket and admin policies
  verify-project-preview-storage.sql  Read-only Stage 7 policy/checkpoint checks
  verify-project-preview-cleanup.sql  Read-only final Stage 7 cleanup check
  setup-atomic-project-ordering.sql  Applied invoker RPC and execute permissions
  verify-atomic-project-ordering.sql  SELECT-only RPC/grant/order inspection
tests/
  projects.test.mjs  Isolated validation/action/Storage tests; no production access
  project-order.test.mjs  Ordering state, validation and authorized RPC tests
  cms-demo.test.mjs  Local interactions, persistence, previews and import isolation
  github-import.test.mjs  URL/API normalization, errors, duplicates and read-only import
  admin-project-draft.test.mjs  Picker cancellation, form fields and tab draft recovery
  ai-autofill.test.mjs  Mocked authorization, context, schema, failures and MUSE regression
  fixtures/         Small JPEG, PNG and WebP validation fixtures
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
- `/admin` — protected project management with administrator CRUD and persistent ordering.
- `/admin/login` — private administrator sign-in; no registration.
- `/cms-demo` — public interactive CMS demonstration; changes stay in the visitor's tab.

The CMS routes are excluded from search indexing. The portfolio and `/cms-demo` are public. `/admin` requires Supabase Auth and membership in `public.admin_users`. Its project mutations independently repeat this authorization in Server Actions and use the authenticated user's Supabase client. `/cms-demo` needs no sign-in and has only local mutation handlers, with no real administrator action integration.

The homepage awaits `getProjects()` from `src/lib/projects.ts`, then passes frontend `Project` objects into `Projects`. `ProjectCard` receives each project through props and does not depend on Supabase. The server maps database column names to the existing card model and button labels. Only visible rows are selected, ordered by `position` ascending and then UUID `id` ascending for deterministic ties. RLS remains the database's access boundary.

The homepage renders on each incoming request using Next.js `connection()`, and the Supabase client's fetch uses `cache: 'no-store'`. No project results are persisted in Next.js's data cache or prerendered at build time. Successful mutations call `revalidatePath('/admin')` and `revalidatePath('/')`; the active CMS receives fresh server data without a manual refresh. Other already-open portfolio tabs need a refresh. Future caching can be added in the server data layer without changing the cards.

Empty results render “No projects to display yet.” Database failures throw a sanitized server error and show an error boundary with retry; there is no automatic fallback to local projects. Reads time out after ten seconds. Builds validate environment configuration and compile the integration but do not query the database.

GitHub import, optional AI Auto-fill and automatic website screenshots are available only in the real CMS. Production database and Storage mutations stay server-side; there is no browser Supabase client, project mutation API route or service-role key. Public demo changes use browser state and tab storage only.

## CMS Interface

`/admin` calls `getAdminProjects()` on the server and passes camelCase `AdminProject` objects into `AdminProjects`. Both queries share a single row-reading helper. Public `getProjects()` always uses an anonymous client and adds `visible = true`, even for a signed-in administrator. The admin query first calls `requireAdmin()`, then requests all projects with that user's authenticated client. Both queries use deterministic position/ID ordering and uncached fetching.

The existing administrator SELECT policy allows the authenticated dashboard to read both published and hidden projects. The ten original projects remain published.

The interface includes:

- Immediate local search by title, category and technology, with a no-results state.
- Compact rows with previews, published/hidden status, positions, technologies and available project links.
- A shared Add/Edit dialog with project fields, technology chips and visibility. Save persists validated changes. The real Add form keeps unfinished fields in this tab when closed; Discard draft resets them. Closing Edit discards its changes. Failed saves retain entered values and display field or generic errors.
- A compact GitHub import section in the real Add Project form. Public repository metadata fills editable fields; import itself never saves a project or uploads a preview.
- Optional preview selection/replacement with a local image preview and filename. Upload starts only on Save; cancelling creates no Storage object. An existing URL/local asset remains available as a secondary option.
- Automatic screenshot attempts after GitHub import and Retake Screenshot beside the preview. Manual Choose File remains available; capture failures preserve the form and current preview.
- Explicit delete confirmation with a pending state, error feedback and focus restoration after deletion.
- Dedicated mouse/touch drag handles, keyboard Arrow Up/Down and Move Up/Down buttons. Reordering changes only the draft until Save order; Reset adopts the latest saved order. Clear search before reordering so moves always correspond to the complete list.
- Native modal dialogs with focus containment, Escape/backdrop dismissal, focus restoration and scrollable forms on smaller viewports. Dismissal and duplicate submission are disabled while a mutation is pending.

Add, Edit and Delete are disabled while order changes are unsaved or a save is pending. Save or Reset the order first; this avoids changing the project set under a local draft. `/cms-demo`, the public portfolio and the unchanged static demo files remain separate from the management interface.

## Add Project Draft Recovery

The real `/admin` Add form keeps its editable fields in `sessionStorage` under `portfolio:admin:add-project:v1`. Typing, GitHub imports and accepted AI suggestions write synchronously during the corresponding interaction. Reopening or refreshing restores unfinished text, technologies, visibility, preview URL/source mode and import provenance (`source`/`github_repo`). Incomplete draft fields are preserved as entered; full project validation still runs server-side on Save. Successful Create clears the draft; Discard draft clears storage and resets the open form, file selection and import feedback.

Files and blob preview URLs are never stored. Closing releases selected previews; files must be reselected after reopening or refresh. Storage uses a versioned, bounded allowlist with type/length and repository consistency checks. Corrupted drafts are ignored, credentials/internal row fields are excluded, and blocked browser storage falls back to an open-form-only draft with a notice. Browser storage is read only after hydration. Edit and the public demo do not use this draft key or persistence adapter.

Native file-input cancellation bubbles through the enclosing dialog. Previously the dialog dismissed itself for that child event, unmounting all form state. Its cancel handler now handles only events originating from the dialog itself, preserving native Escape dismissal while ignoring picker cancellation and same-file reselection. See [the file-input cancel event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/cancel_event). Regression checks reproduce that event path and cover preview selection/replacement, imported data, reopening, refresh, discard, successful Create and unchanged Edit/demo behavior at 375px and 1440px using isolated fixtures. No production project or Storage object is modified during those checks.

## Public CMS Demo (Stage 9)

`/cms-demo` renders a public workspace with a Demo Mode notice, Back to portfolio link and Reset demo control. Its server page calls `getDemoProjects()` through the same anonymous, uncached row-reading helper as the portfolio, always with `visible = true`. It serializes only presentation/form fields, including public project IDs; hidden rows, internal source/repository/timestamp fields, cookies and credentials are not supplied to the demo. The initial snapshot contains the ten visible production projects.

The real and demo workspaces reuse `AdminProjectCard`, `ProjectDragHandle`, `ProjectFormDialog`, `ProjectDeleteDialog`, `PreviewImageInput`, `TechnologyInput` and the accessible native `Dialog`. Real `ProjectForm` and `DeleteProjectDialog` are small adapters that import the existing protected Server Actions. The shared dialogs accept callbacks and contain no real mutation imports. `CmsDemo` supplies separate browser-local callbacks; its client import graph cannot reach administrator actions, authorization, Supabase clients, Storage helpers or the ordering RPC. The `localOnly` presentation option changes explanatory text, not a security-sensitive mutation implementation.

Demo Add generates a browser UUID and appends a local project. Edit retains its ID and changes only local fields, including visibility. Delete requires confirmation and removes only the local project. Shared form/file validation supplies the same field limits and useful errors. The demo supports up to 100 projects to bound stored data. No demo Server Action, API route, authentication request, upload or database mutation is implemented.

Drag handles, mouse/touch input, keyboard Arrow Up/Down and Move Up/Down use the existing ordering utilities. Changes affect a separate draft; Save order updates only the local saved order and normalizes local positions. Reset order restores the last locally saved order. Search disables every reorder control, and unsaved ordering blocks Add/Edit/Delete, matching `/admin`. Stage 8's atomic production RPC and its authenticated Server Action remain separate and unchanged.

Text, visibility, saved order and draft order persist in `sessionStorage` under `portfolio:cms-demo:v1`, scoped to the browser tab. Parsing checks the version, size, field allowlist, URLs, UUIDs, duplicates and complete ordering sets; corrupt or unsafe data falls back to the initial snapshot. Browser storage restrictions or quota failures degrade to React state for the current page, with an explanatory notice. The workspace mounts after hydration so stored changes cannot cause server/client HTML mismatches. No project data is stored in cookies or on the server.

Selected JPEG, PNG and WebP files up to 5 MB stay on the visitor's device. MIME/extension, size and signature checks run locally; SVG and other formats are rejected. The picker owns its temporary selection URL. Saving creates a separate workspace-owned object URL so the row keeps its preview after the dialog closes. Replacement, deletion, Reset demo and unmount revoke unused owned URLs without touching local assets or remote images. Blob URLs and file bytes are never persisted. After refresh/navigation, textual changes remain and selected images fall back to the prior stable preview URL, or no preview for a newly added project.

Reset demo asks for confirmation, restores the page's initial public snapshot, removes demo-created projects and edits, restores visibility and ordering, clears the dirty draft/search, replaces the stored demo state and releases obsolete image URLs. Closing/cancelling a form discards its draft without uploading anything. There are no public links to administrator login in the demo.

Stage 9 verification passed 60 automated tests, TypeScript, ESLint and the production build. The architectural test traverses the actual client import graph; separate tests exercise the anonymous visible-only query, local CRUD/visibility, draft/saved sorting, reset, storage parsing/fallback and preview lifetimes. Anonymous live Chrome checks covered all demo interactions, keyboard/focus/Escape behavior, mouse/touch drag and 320px/375px/768px/1440px layouts. Browser/server audits recorded zero demo Server Action, Auth, RPC, database-write or Storage-mutation requests and zero console errors. Administrator form/preview regression tests ran against fully isolated Supabase/Auth fixtures; production write verification was unnecessary for this UI extraction.

Public portfolio previews, content, links and all five static demo routes passed read-only checks. Full project and Storage fingerprints from SELECT-only SQL before and after testing matched exactly: ten original projects, normalized positions 0–9, unchanged project fields/preview URLs and zero Storage objects. No database migration, RLS policy, table grant, bucket, authentication change, service-role credential or dependency was added.

Future GitHub import must preserve this boundary: authenticated production orchestration belongs only to the real CMS adapter; a public demonstration must use local fixture/preview data and must not import the real action or access private integrations.

## Atomic Project Ordering (Stage 8)

`AdminProjects` keeps separate saved and draft ID arrays. Dragging by the dedicated handle or using the keyboard/buttons changes only the draft. Save and Reset are disabled when unchanged, and search disables all ordering controls. Pending saves prevent duplicate submission and further edits. Failed saves keep the draft; an authoritative server refresh exposes concurrent changes without silently replacing its original baseline. Reset explicitly adopts the latest saved list.

`reorderProjects()` independently calls `requireAdmin()` before validation and uses that user's authenticated Supabase client. The browser submits only complete `ordered_ids` and `expected_order` UUID lists, including hidden projects, never position values or filtered search results. Server validation rejects malformed/null/duplicate IDs, excessive arrays and mismatched submitted sets, then performs one call to the existing `public.reorder_projects(uuid[], uuid[])` RPC. The RPC is the authoritative complete-set and concurrency boundary; there is no separate pre-read followed by multiple update requests. Success revalidates `/admin` and `/` while retaining uncached data access. Raw database errors are never returned to the UI.

`supabase/setup-atomic-project-ordering.sql` was applied manually before the UI implementation. Its one function uses `SECURITY INVOKER`, a fixed `pg_catalog` search path and enabled row security. It independently verifies `auth.uid()` membership in `public.admin_users` before locking. Existing authenticated SELECT/UPDATE grants and project RLS remain authoritative; no new table grants or policies are added. Function execution is revoked from PUBLIC, anon and service_role, and granted to authenticated callers, with administrator membership still required.

Inside the RPC transaction, `SHARE ROW EXCLUSIVE` blocks concurrent INSERT/UPDATE/DELETE and serializes reorder calls while allowing ordinary SELECT. Under READ COMMITTED it reads every project, compares the submitted set and expected order against the current `ORDER BY position, id`, derives positions `0..n-1` from UUID array ordinality and updates only `position`. Duplicate/null/incomplete/unknown IDs, stale baselines, affected-row mismatches or invalid final mappings raise an exception and roll back the complete call. Empty arrays are accepted only for an empty table. No unique position constraint or temporary-position logic is added. Other columns, IDs, timestamps, previews and Storage paths are preserved.

The SELECT-only verification file inspects configuration without invoking the RPC. Live application verification saved a two-project swap, confirmed persistence after dashboard refresh and the public order change, then restored and refreshed the exact original order. Every field of the original ten records matched the initial snapshot, positions returned to 0–9, preview URLs stayed unchanged, and read-only Storage inventories remained empty. A real stale-baseline request and anonymous RPC execution were denied. Controlled browser tests independently verified authenticated non-member Server Action denial without contacting production Supabase.

Stage 8 verification ran 47 automated tests covering ordering state/validation/action contracts and the existing CRUD/Storage checks. Browser verification covered mouse and touch drag, keyboard fallback/focus, search guards, dirty-order CRUD protection, failure preservation, stale-order recovery, hidden-project inclusion and 320px/375px/768px/1440px layouts. The public portfolio, project links, static demos, authentication/logout and the then-placeholder `/cms-demo` were verified with zero CMS console errors and no direct browser Supabase mutations. No new runtime dependency or service-role credential was introduced.

Creation now uses the separately reviewed and manually applied `public.create_project_first(...)` RPC. It takes the same `SHARE ROW EXCLUSIVE` lock as `reorder_projects`, preserves every existing project's relative `ORDER BY position, id` order (including hidden projects), normalizes them to `1..N` and inserts the new project at `0` in one transaction. The complete final mapping is checked before returning; any failure rolls back the insertion and all position changes. Deletes may still leave gaps; the existing reorder RPC normalizes the complete set when saved.

## Secure Administrator CRUD (Stage 6)

`createProject()`, `updateProject()` and `deleteProject()` each call `requireAdmin()` before validation or queries. Authentication alone is insufficient: authorization requires the user's own row in `public.admin_users`. Actions use the returned cookie/session-based Supabase client, and PostgreSQL independently enforces administrator-only writes through RLS. The layout and disabled buttons are not security boundaries.

`supabase/grant-admin-project-writes.sql` has been applied manually. It preserves existing SELECT policies and adds only INSERT, UPDATE and DELETE table privileges for `authenticated`, plus these policies:

- `cms_admin_insert_projects`: administrator membership in `WITH CHECK`.
- `cms_admin_update_projects`: administrator membership in both `USING` and `WITH CHECK`.
- `cms_admin_delete_projects`: administrator membership in `USING`.

No write privilege is granted to `anon` or on `admin_users`. Authenticated non-members still cannot write. No service-role credential is used, RLS remains enabled, and public registration remains unavailable.

Validation uses a small TypeScript allowlist without additional dependencies. Required title/category/description values are trimmed and bounded; optional blanks become NULL. Links require valid HTTP(S) URLs without credentials. Preview paths may start with `/assets/`; production paths may start with `/projects/`. Unsafe protocols, malformed URLs and local path traversal are rejected. Technologies are trimmed, deduplicated and bounded to 30 values of at most 50 characters; visibility must be a boolean. Errors returned to the browser never contain raw database details.

Creation generates a server UUID, sets `source = 'manual'` for ordinary entries or `github` for a reviewed GitHub import, derives `github_repo` from normal GitHub repository URLs and passes only explicit validated fields to `create_project_first`. PostgreSQL assigns the new row position `0` and its timestamps while shifting/normalizing the complete previous catalog to `1..N`. No position allocation, separate INSERT or timestamps are sent to the RPC. Editing uses explicit allowed columns and preserves ID, source, creation time and stored position. Delete targets one validated UUID and requires confirmation. Missing rows are reported as unavailable rather than successful mutations.

`supabase/setup-create-project-first.sql` defines one `SECURITY INVOKER` function with `search_path = pg_catalog` and `row_security = on`. It independently checks administrator membership and retains the existing project grants/RLS. Execution is revoked from PUBLIC, anon and service_role and granted only to authenticated callers. `supabase/verify-create-project-first.sql` inspects its configuration and catalog with SELECT only; neither file invokes creation. The migration does not change existing tables, policies, indexes, Storage or `reorder_projects`. Preview upload still precedes the RPC and failed creation compensates by removing its new object only if no committed project references it. Existing projects' content, timestamps and preview references are untouched by the position shift.

The create-first integration was verified against the intentional eleven-project production baseline. One hidden temporary project with a preview persisted at position `0`; all eleven previous records shifted to `1..11` with every other field and their relative order unchanged. After deleting only that temporary project, the existing protected reorder action normalized the unchanged original ID order back to `0..10`. Complete project records and the Storage inventory matched the before-test snapshots exactly; the temporary preview was no longer available. The Add draft cleared on successful creation. Automated tests cover the RPC transport/allowlist, failure and interrupted-response cleanup, both GitHub duplicate guards, first-position ordering and draft preservation/clearing. These mocked action tests do not replace database transaction/RLS verification.

Live verification created only a hidden `CMS CRUD Test`, verified that it persisted in `/admin` while remaining absent from `/`, edited it, and deleted it. The authenticated dashboard returned to exactly ten projects, and every original row—including IDs, content, positions, visibility and timestamps—matched the pre-test snapshot. Live logged-out direct action calls were denied. Controlled authenticated non-member sessions also verified direct denial by all three actual Server Actions, with identity/membership rechecked and no project query executed. `supabase/verify-admin-project-writes.sql` independently verified administrator CRUD, anonymous denial, non-administrator RLS denial and hidden-row access inside a rollback-only transaction, ending with ten original projects and zero test rows. It can be rerun intentionally in the SQL Editor after cleanup; never commit that verification transaction.

## GitHub Import (Stage 10)

The protected Add Project dialog accepts `https://github.com/owner/repository` with optional `.git` and trailing slash. `importGithubRepository()` independently calls `requireAdmin()` before input validation, duplicate checks or GitHub requests. The browser invokes this Server Action and never requests GitHub directly. Import performs reads only; review/edit the populated form and use the existing Save project button to create a project. Closing retains imported data in the local Add draft without touching projects or Storage; Discard draft clears it.

URL validation permits only the exact HTTPS GitHub host and two bounded owner/repository segments. Credentials, ports, query/fragment suffixes, encoded separators, traversal, extra segments and invalid names are rejected. The server constructs fixed `https://api.github.com/repos/{owner}/{repo}` and `/languages` URLs from that identity. Redirects are not followed; moved repositories require their current URL. Requests use `Accept: application/vnd.github+json`, `User-Agent: Portfolio-CMS/1.0` and the current `X-GitHub-Api-Version: 2026-03-10`. See [GitHub repository endpoints](https://docs.github.com/en/rest/repos/repos) and [API versioning](https://docs.github.com/en/rest/about-the-rest-api/api-versions).

There is no GitHub token, environment variable, OAuth, GitHub App or added dependency. Only public repositories are accessible. Unauthenticated API requests share GitHub's per-IP rate limit, including deployments with shared egress; each successful import uses two requests. Exhaustion returns “GitHub API rate limit reached. Please try again later.” See [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). Each request times out after ten seconds, and streamed JSON is bounded to 256 KiB for metadata and 32 KiB for languages. Missing/private repositories, access failures, redirects, invalid responses and network outages return safe messages without raw response bodies. Archived repositories produce a non-blocking warning.

Mapping is deterministic: repository name → title; plain description → short/full description; canonical repository URL → GitHub URL; valid HTTP(S) homepage → production URL; language names → technology chips ordered by code-byte count with stable name ties. No framework inference, marketing copy, README/image fetching, AI or screenshots occurs. Missing descriptions/homepages/languages remain empty for review. Category is left for manual selection; visibility, Telegram URL and any selected/local preview are preserved.

Repository identity is normalized to lowercase `owner/repository`. Import checks existing `github_repo` values using the authenticated client's case-insensitive literal lookup, including hidden projects and legacy mixed-case values. Creation repeats that check before any upload, then `create_project_first` checks again under its table lock to prevent concurrent creates of the same repository. A duplicate caught by either guard produces the same useful field error; a failed RPC still cleans its newly uploaded preview. The server derives the stored repository from the validated GitHub URL and sets `source = 'github'` only when the import marker matches it; submitted source/position/ID/timestamps remain ignored. Manually changing the GitHub URL clears the marker. The marker classifies an administrator-reviewed entry, rather than proving GitHub provenance. No UNIQUE constraint was added; edits retain their existing validation and do not provide a database-wide repository uniqueness guarantee.

`GithubImport` and the real form adapter alone import the protected action. The shared form accepts a presentation-only prefill slot; `/cms-demo` supplies no slot and its complete client import graph cannot reach GitHub fetching/actions, authenticated clients, Storage or real mutations. Existing RLS, grants, authentication, preview cleanup and atomic ordering remain unchanged.

Verification covers URL/response/language normalization, rate limits, bounded bodies, duplicates, independent authorization, read-only import and demo isolation. Isolated browser fixtures exercise loading/errors, editable prefill, selected-preview preservation and the existing Create/upload/delete cleanup flow. Live administrator verification imported `vercel/next.js` twice, edited fields locally and cancelled without saving; all ten complete production rows, positions 0–9, preview URLs and the empty Storage inventory matched the pre-test snapshots. Logged-out direct import calls were denied. Homepage cards/images/links, the CMS Demo promo, anonymous demo, five static demos, logout, 320px/375px/768px/1440px layouts and zero console errors were verified.

## AI Auto-fill (Stage 11)

The real `/admin` Add Project form offers optional **AI Auto-fill** after GitHub import or entering a valid GitHub URL. It replaces only title, category, short description, description and technologies. Suggestions remain editable, and nothing is saved until the normal **Save project** action succeeds. Accepted suggestions enter the existing tab draft immediately; links, GitHub provenance, visibility and selected preview files remain unchanged. Failures preserve the form. `/cms-demo` has no AI control or connection to the real AI service.

Configure only the server-side variable `OPENAI_API_KEY` locally and on Vercel. Missing configuration disables the AI operation gracefully without breaking other portfolio/CMS features. Never put the credential in a public variable or commit an actual environment file.

`autofillProject()` independently calls `requireAdmin()` before external requests. GitHub remains tokenless: the server reads only metadata, languages, README and root `package.json` through four constructed endpoints on the fixed API origin, without following redirects or repository links. Streaming response limits are 256 KiB for metadata, 32 KiB for languages and 128 KiB per optional file envelope. README decoding is capped at 32 KiB, package decoding at 64 KiB, the package projection at 8 KiB, metadata/languages at 4 KiB and complete serialized context at 48 KiB. Missing/invalid/oversized optional files are omitted with a notice; insufficient descriptive evidence skips the paid call. Package versions, scripts and arbitrary values are excluded.

The official `openai` SDK uses Responses with centralized `gpt-5.4-mini`, reasoning disabled, no tools, no automatic retries, a 25-second provider timeout and a 1,200-token output cap. The action has a 45-second post-authorization deadline; the admin page permits 90 seconds for authorization and response overhead. Strict JSON Schema requires exactly five fields, followed by independent type/length/control-character validation and technology normalization. Conservative evidence checks reject explicit contradictions of documented mock/no-backend/no-database/no-authentication functionality and unsupported technologies. They cannot establish every semantic fact, so administrator review remains required. Repository content is untrusted data, separated from trusted instructions; environment/session data and preview files are never sent to the provider.

This feature changes no SQL, RLS, Storage policies or mutation architecture. All normal tests use mocked GitHub/provider responses, including the MUSE scripted-chat regression fixture, and never make paid AI calls. Live AI verification requires an explicit, suggestion-only approval and must not save a project or touch Storage.

## Automatic Website Screenshot (Stage 12)

After a successful GitHub import, the real Add form attempts to capture its imported Production URL. Supported targets are HTTPS subdomains of `vercel.app`, `netlify.app`, `pages.dev` and `github.io`, using port 443 without credentials. Custom domains are skipped without changing imported metadata; manual Choose File remains available. Retake Screenshot uses the current Production URL without repeating import, AI or Save. Capture errors retain the existing preview and draft.

The same-origin `POST /admin/screenshot` Route Handler independently calls `requireAdmin()` before DNS/browser work and returns a raw, uncached JPEG up to 2 MiB. Capture uses `playwright-core` 1.63.0 and bundled `@sparticuz/chromium` 153.0.0, with a 1440 × 900 viewport, device scale 1, quality 85, reduced motion, bounded readiness and no full-page capture. Navigation is limited to 15 seconds and capture to 45 seconds, with no retry. No screenshot service, AI request, executable download during capture or new credential is used.

A per-capture loopback CONNECT proxy resolves both A/AAAA, rejects every unsafe/mixed answer, and connects directly to a vetted public IP without a second hostname lookup. HTTPS tunnels retain certificate verification. CDP pauses both requests and responses to validate redirects before following them; the redirect chain is bounded. Only the target, validated hosting redirects and a short exact list of asset CDNs are permitted. Frames, workers, WebSockets, device permissions, downloads and popups are restricted. Each browser is fresh and receives an explicit minimal environment without application secrets. This is an application-level egress boundary for trusted single-admin usage, not VM isolation against a native browser exploit.

Screenshot bytes become a browser-local JPEG File and enter the same pending preview mechanism as manual images. Nothing reaches Supabase Storage or project data until the existing Save action. Cancel releases local object URLs; successful replacement releases the previous URL. Stale screenshot responses cannot override a changed URL or newer preview. AI suggestions still change only their five text/technology fields. Tab drafts never serialize files, blobs or screenshot bytes; after refresh, use Retake or Choose File. `/cms-demo` has no capture control or import path to screenshot code.

Use Node 22.17+ or 24+ and the Node.js Vercel runtime. Chromium assets are included specifically in the screenshot route trace. After building, run `npm run check:screenshot-bundle` to verify the binary assets, matching Chromium major version and conservative Next route/shared-runtime footprint below 250 MiB. The packaged executable targets Linux x86_64. This local inspection does not prove a Vercel launch: confirm the project Node version, deployment architecture, 2 GB memory availability and Preview runtime before considering deployment verified. macOS development uses an already installed compatible Chrome/Playwright browser; it never downloads one during a capture request.

macOS development discovers an installed Playwright browser or Chrome/Chromium in system/user Applications, checking app metadata for Chromium 153 or newer. No browser is downloaded. Linux always uses bundled Sparticuz; production/Vercel never falls back to a macOS executable. Browser launch security settings are identical. Server warnings identify bounded capture stages (launch, proxy, navigation, output, timeout) and safe failure categories without logging URLs, credentials, headers or raw browser errors. Client errors remain generic.

Response interception supports HTTP/2, whose status text is empty: Chromium supplies the standard response phrase instead of receiving an invalid empty override. Server diagnostics distinguish interception, TLS, HTTP, DNS, tunnel and navigation failures; raw errors remain private.

The normal tests mock websites, DNS/provider calls and screenshot output; local socket fixtures exercise the proxy without contacting production sites. `npm run test:screenshot-navigation` separately runs installed Chrome against ephemeral local HTTPS fixtures through the production CONNECT proxy and interception code. It checks HTTP/2 and HTTP/1.1 redirects, certificate rejection and unsafe redirects using injected DNS/transport. Only the fixture's temporary certificate is trusted in successful test browsers; production TLS checks stay intact. This command requires OpenSSL and a compatible installed macOS browser or bundled Linux Chromium, and takes no screenshots. Any live website capture is a separately approved, suggestion-only check with no Save, database or Storage mutation.

## Project Preview Storage (Stage 7)

Project previews can be uploaded or replaced through the existing authenticated Add/Edit Server Actions. The `project-previews` bucket is public for image reads, with a maximum of 5 MB (5,242,880 bytes) and JPEG, PNG or WebP MIME types. SVG, GIF, HTML and other formats are rejected. Client checks provide immediate feedback; server checks independently enforce non-empty files, size, matching MIME/extension and file signatures. Next.js allows a 6 MB Server Action body to accommodate the image and multipart form fields.

`supabase/setup-project-preview-storage.sql` has been applied manually. Storage RLS remains enabled. Its three bucket-specific policies authorize `authenticated` users only when their UUID exists in `public.admin_users`: `cms_previews_admin_select` supports metadata access needed by deletion, `cms_previews_admin_insert` allows generated preview paths, and `cms_previews_admin_delete` allows their removal. Replacements create a new object; no UPDATE/upsert policy is added. Supabase's existing Storage privileges are retained, without new Storage GRANT statements or a service-role key. See [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

Upload and removal helpers each call `requireAdmin()` independently and use the administrator's cookie-based Supabase client. FormData is parsed through an explicit field allowlist. The server chooses `projects/<project UUID>/preview-<file UUID>.<extension>` and saves the full public Storage URL in `projects.preview_url`. Unique paths prevent overwrite collisions and stale replacement caches. Hidden projects stay out of the public portfolio, although their uploaded preview URLs are public bucket files.

Creation uploads before inserting the project. If the database save fails, the new object is removed when it is safe to do so. Replacement uploads to a new path, updates the row, then removes the old managed object. A failed update cleans the new upload and preserves the old image. Editing compares the current preview reference before saving to avoid overwriting a concurrent replacement. Cleanup checks for surviving database references, including an interrupted response after a committed save.

Deletion removes the database row first, then its managed preview through the Storage API. Cleanup failures produce a sanitized server warning and preserve the successful database change. There is no background orphan sweeper. Recognition requires the exact configured public Storage URL, bucket, project UUID and generated filename; local `/assets/...` files, external previews and another project's paths are never deleted. All original previews and files under `public/` remain unchanged. Previews continue using ordinary responsive `<img>` elements.

Live verification used only a hidden `CMS Storage Test`: uploaded a PNG, verified administrator and anonymous image rendering, replaced it with WebP, verified persistence and old-object removal, then deleted the project and replacement through the authenticated application flow. Exactly ten original rows remain, including unchanged timestamps, with zero test rows and zero objects in the new preview bucket. Anonymous Storage API upload/replacement was denied and deletion affected no files. Direct actions reject logged-out callers and controlled authenticated non-members. The read-only SQL checkpoint verified installed role restrictions, non-admin/admin membership predicates, metadata SELECT access and replacement cleanup; it does not simulate Storage API requests or mutate Storage metadata.

The Stage 7 checkpoint SQL expects eleven rows and one replacement object while that temporary test is paused. The final cleanup SQL expects ten original rows and an empty preview bucket after deletion. These are migration verification files, not general maintenance scripts. Storage metadata is read-only in these checks; actual uploads and deletions use the API, following [Supabase's Storage schema guidance](https://supabase.com/docs/guides/storage/schema/design).

The CRUD/Storage tests run without production Storage and cover formats/signatures, size limits, path safety, independent authorization, compensating cleanup, failed replacements, shared references and local asset preservation. Browser checks cover 320px–1440px layouts, dialog focus/Escape behavior, authenticated refresh/logout, unchanged public projects/static demos, and zero console errors or direct browser Supabase mutations. Stage 8 sorting changes positions without changing project IDs or preview paths.

## Administrator Authentication (Stage 5)

Authentication uses `@supabase/ssr` and SDK-managed cookies. Sign-in and sign-out run in Server Actions; credentials and tokens are never returned to components or logged. There is no browser Supabase client or localStorage session. Cookies are HttpOnly, SameSite=Lax and Secure in production. Use HTTPS for deployed production environments.

`src/proxy.ts` matches only `/admin/:path*` and calls `getClaims()` to refresh sessions before rendering. Refreshed cookies are copied to both the request and response; SDK cache headers are preserved, and admin responses use `Cache-Control: private, no-store`. Authenticated pages are dynamic and auth/project fetches are uncached.

`requireAdmin()` is shared by the protected route-group layout, `getAdminProjects()` and every project mutation. It verifies the current user with `getUser()` and selects that user's own `admin_users` row. Missing sessions redirect to `/admin/login`; authenticated non-members are denied, and verification errors fail closed with generic messages. Login repeats these checks after `signInWithPassword()` and signs out rejected sessions. An already authorized administrator visiting `/admin/login` is redirected to `/admin`.

Sign out uses Supabase's local scope to end the current session, removes its SDK cookies and redirects to `/admin/login`. Other devices are unaffected. Errors remain generic and allow retry.

Public registration is intentionally unavailable: there is no registration route, form or `signUp()` call. Administrators must be created manually in Supabase Auth and added manually to `public.admin_users`. The existing own-membership and administrator project SELECT policies must already exist. Authentication setup does not create tables or project write permissions; the separate Stage 6 SQL supplies write policies/grants. `.env.example` remains limited to the URL and publishable key, with no privileged credentials.

An RLS SELECT policy also requires the underlying table SELECT privilege. If sign-in reports “Unable to verify access” and the server logs `Administrator membership lookup failed (42501)`, inspect and apply `supabase/grant-admin-users-read.sql` in the Supabase SQL Editor. It grants SELECT on `admin_users` only to `authenticated`, with no anonymous grant, write grant or RLS/policy change. Existing RLS still limits users to their own membership row. Diagnostics log only a sanitized code, never identities, credentials or raw database errors. See [Supabase's permission error guidance](https://supabase.com/docs/guides/troubleshooting/database-api-42501-errors).

## Seed the Existing Projects

The `public.projects` table and its visible-only SELECT policy must already exist. The seed leaves the existing schema, RLS settings and policies intact; the separate Stage 6 migration adds administrator write policies.

The initial setup returned PostgreSQL `42501`, “permission denied for table projects.” This was resolved by executing `supabase/grant-projects-read.sql`, which grants only SELECT to `anon` and `authenticated`. RLS determines readable rows; this read-grant file adds no INSERT, UPDATE or DELETE access. For a fresh environment with the same permission error, run that file in the SQL Editor before seeding. See [Supabase's permission error guidance](https://supabase.com/docs/guides/troubleshooting/database-api-42501-errors).

1. Open the Supabase SQL Editor for the intended project.
2. Paste the entire contents of `supabase/seed-projects.sql` and run it intentionally.
3. Confirm that the final result lists ten visible projects, in positions 0–9.
4. Refresh the portfolio and verify its ten cards against the seed contents.

The SQL was generated directly from the former `src/data/projects.ts`: titles, categories, full descriptions, previews, technologies, production/GitHub/Telegram links and visual order are preserved. `short_description` is NULL because the original cards have only one description. Each row has `source = 'manual'`; `github_repo` is derived as `owner/repository` when a GitHub repository link exists. Images stay in `public/assets/` or at their original external URLs, and demo links stay local.

The seed supplies fixed UUIDs and uses `ON CONFLICT (id) DO NOTHING`, relying on the table's UUID primary key. Repeating the same seed skips its existing rows without overwriting later edits. This protects against rerunning this file, but importing the same projects separately with different IDs could still create duplicates. The SQL runs in a transaction and explicitly supplies both timestamps; it contains no credentials and requires no application write policy.

The permission grant and seed have been executed. All ten visible rows and their frontend mapping have been verified against the original portfolio, including positions 0–9, descriptions, categories, technologies, previews and links. Supabase is the only production data source; the obsolete `src/data/projects.ts` has been removed. The migration SQL files remain as the record of the initial import and permission repair.
