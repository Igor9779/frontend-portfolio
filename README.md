[English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

# Frontend Portfolio

Igor Bondarenko’s portfolio, built with Next.js App Router, React, TypeScript and Tailwind CSS. Supabase is the source of truth for production projects. The interface supports English, Ukrainian and Russian; CMS project content stays in its original language.

## Routes

- `/` — public portfolio, with visible projects in their saved order and a link to the interactive CMS demo.
- `/admin` — protected CMS for an authenticated administrator.
- `/admin/login` — administrator sign-in; public registration is unavailable.
- `/cms-demo` — public, local demonstration of the CMS. No sign-in required.
- `/projects/*` — five preserved standalone sites: LivesTopAir, PagesMaxAir, WorksAllsDay, PathsTopNow and WordsMaxLab.

## Real CMS

Create, edit, hide and delete projects. New projects are inserted first atomically with `create_project_first()`; existing relative order is preserved. Drag handles and keyboard-accessible Move Up/Down controls change a draft order. Save commits the complete order through `reorder_projects()`; Reset restores the saved order. Searching disables ordering, and unsaved order changes block CRUD.

Add Project text drafts persist in `sessionStorage` within the tab, including imported values. Closing or refreshing restores unfinished text. Successful creation, explicit discard, or reaching a server-confirmed signed-out login screen clears the administrator draft. Files and screenshot bytes are never stored in the draft.

### Previews

Manual previews accept JPEG, PNG and WebP, up to 5 MB; SVG is rejected. Server validation checks MIME, extension and file signature. Images use unique project-specific paths in the public `project-previews` bucket. Replacement saves the new reference before cleaning up the old managed image. Failed creation/replacement compensates with safe cleanup; a cleanup failure does not undo a successful database deletion. Existing `/assets/...` previews remain supported and local assets are never deleted.

### GitHub, AI and screenshots

GitHub Import uses the public GitHub REST API without a token. Validated repository identifiers produce fixed API endpoints; metadata and language names prefill editable fields. Import creates nothing. Duplicate repository checks run during import and final creation.

AI Auto-fill uses the server-only OpenAI Responses API with bounded metadata, languages, README and package evidence. Structured suggestions replace only title, category, descriptions and technologies. They remain editable; GitHub provenance, links, visibility and preview selection stay unchanged. Missing configuration or provider failures preserve the form. Nothing is saved until normal Save/Create.

After GitHub Import, a supported HTTPS homepage can produce a pending screenshot. Retake Screenshot captures the current Production URL; Choose File remains available. `playwright-core` and `@sparticuz/chromium` capture a 1440 × 900 JPEG through an admin-only Node.js Route Handler. Restricted hosting domains, validated public DNS answers and a DNS-pinned CONNECT proxy prevent unrestricted forwarding. TLS validation stays enabled. Fresh browser contexts receive a minimal environment without application secrets. Capture is bounded and does not use OpenAI, write projects or upload Storage objects. Screenshot bytes become a browser File and use the existing preview pipeline only on Save.

## Public CMS demo

The demo uses bundled project fixtures and deterministic local GitHub → preview → AI simulations, including the MUSE sample. It supports local CRUD, visibility, previews, create-first behavior, draft ordering and Save/Reset. Simulated actions are disclosed. Unsupported repositories receive a clear message instead of a real API request.

Demo text and order persist in tab-scoped `sessionStorage`. Local files remain on the device; object URLs are released when no longer needed and files fall back after refresh. Reset demo restores the original bundled dataset. The demo cannot import production Server Actions, Auth, Supabase clients, OpenAI or screenshot infrastructure. Simulations incur no GitHub API usage, AI cost, screenshot compute or production writes. Ordinary local assets and external link navigation remain available.

## Localization and accessibility

EN / UK / RU controls switch interface text without a page reload. A validated `localStorage` preference applies after hydration; invalid or blocked storage falls back safely. The document language follows the selected interface language. Titles, descriptions, categories, technologies and URLs from Supabase or demo fixtures are not translated or mutated.

Public pages, the demo and administrator presentation support all three languages. Keyboard controls, visible focus, skip navigation, labeled forms, dialog focus/Escape handling and reduced-motion behavior are preserved. Legacy standalone sites are intentionally not localized or modified.

## Security model

Supabase SSR cookie sessions identify the user. Every privileged Server Action and screenshot request independently calls `requireAdmin()` to verify authenticated identity and membership in `admin_users`. Database/Storage RLS and invoker RPC authorization independently enforce the same boundary. The publishable Supabase key is public by design; authorization does not depend on hiding it. No service-role credential, public account creation or browser mutation client is used.

Global headers prevent framing, disable content sniffing and camera/microphone/geolocation access, and limit referrer disclosure. The CSP restricts framing only, preserving legacy scripts/styles. Admin routes are not indexed. Errors and diagnostics avoid credentials and raw provider responses. Localization stores only a browser preference and adds no backend path.

## Local development

Use Node.js 22.17+ or 24+. Install dependencies and copy the empty environment template:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure these variable names locally and in the hosting dashboard; never commit actual values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

The first two configure public Supabase access. `OPENAI_API_KEY` stays server-only and is needed only for real administrator AI suggestions. No GitHub token or screenshot-service credential is required. On macOS, screenshot development discovers an already installed compatible Chrome/Chromium; it never downloads a browser during a request. Linux/Vercel uses bundled Chromium.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run check:screenshot-bundle
npm audit
git diff --check
```

If a local Turbopack worker cannot bind its port, use the existing Webpack production path:

```bash
npm run build -- --webpack
```

The automated suite uses mocks and controlled fixtures, without paid OpenAI calls or production writes. Import-graph tests enforce demo isolation; authorization, uploads, ordering, AI output and screenshot SSRF boundaries have regression coverage. Optional local browser verification commands are separate:

```bash
node --test tests/cms-demo-browser.integration.mjs
node --test tests/localization-browser.integration.mjs
npm run test:screenshot-navigation
```

Screenshot navigation fixtures use local HTTPS only and do not capture live websites. Any live administrator test needs deliberate review and must leave no temporary project or image behind.

## Deployment and database setup

Deploy as a Node.js Next.js application on Vercel, with the same environment variable names and a compatible Node runtime. Keep `public/` assets. The screenshot function externalizes browser packages and explicitly traces Chromium assets plus Playwright’s registry; run the bundle check after production builds. Browser execution requires Linux x86_64 and sufficient function memory/duration. Local trace inspection complements deployment verification.

Files under `supabase/` document the existing schema, grants, Storage policies and atomic invoker RPCs. Setup SQL is reviewed/applied manually; inspection scripts are read-only unless explicitly marked rollback-only. Do not rerun historical seed/verification scripts blindly or disable RLS. Final interface polish/localization requires no migration.

The five historical sites under `public/projects/` retain their original HTML, CSS, JavaScript and assets. Project catalog updates belong in the protected CMS, not hardcoded portfolio data.
