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

The portfolio uses the **Next.js App Router**, **React**, **TypeScript** and **Tailwind CSS**. Its homepage and reusable components are Server Components. ESLint checks the application and its configuration, and Next.js generates route types before the TypeScript check. The existing design, content, project order and responsive breakpoints at 760px and 480px are preserved.

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
    globals.css     Tailwind setup, base rules and appearance keyframes
    admin/page.tsx  Temporary CMS placeholder
    cms-demo/page.tsx  Temporary public demo placeholder
  components/       Hero, Projects, ProjectCard and Footer
  data/projects.ts  Typed local data for all ten projects
  types/project.ts  Project and link interfaces
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

- `/` — existing portfolio with all ten projects.
- `/admin` — temporary page: “Portfolio CMS — coming next.”
- `/cms-demo` — temporary page: “Portfolio CMS Demo — coming next.”

The two CMS routes contain placeholder text only and are excluded from search indexing. They are public at this stage; `/admin` will need authentication before real administrative functionality is added.

The homepage currently reads `src/data/projects.ts` and passes the resulting list into `Projects`. `ProjectCard` receives each project through props and does not depend on a data source. A future server-side query can replace the homepage's local data import without rewriting the cards. The current homepage is prerendered; caching and revalidation should be chosen when live database data is introduced.

Supabase, authentication, CMS operations, AI, GitHub imports and screenshot generation are future work. No integration is implemented or required now.

`.env.example` contains empty placeholders for future integrations. The current application does not read or require them. Actual environment files are ignored by Git; keep future service-role keys and API tokens on the server.
