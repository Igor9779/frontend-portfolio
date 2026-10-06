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

The portfolio itself is a single-page application built with **React**, **TypeScript**, **Vite** and **Tailwind CSS**. ESLint checks the application and its configuration. The existing design, content, project order and responsive breakpoints at 760px and 480px are preserved.

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

Vite prints the local development URL, usually `http://localhost:5173`.

Check TypeScript and ESLint:

```bash
npm run typecheck
npm run lint
```

Build and preview the production site:

```bash
npm run build
npm run preview
```

The production build is written to `dist/`, which is ignored by Git. Deploy the contents of this directory to a static host.

## Structure

```text
src/
  components/       Hero, Projects, ProjectCard and Footer
  data/projects.ts  Typed data for all ten projects
  types/project.ts  Project and link interfaces
  App.tsx
  main.tsx
  index.css         Tailwind setup, base rules and appearance keyframes
public/
  assets/           Original portfolio preview images
  projects/         Five unchanged standalone multi-page demos
  favicon.png
```

The five demo websites keep their original HTML, CSS/Bootstrap, JavaScript, SEO files and internal directory structures. Vite serves them directly during development and copies them to `dist/projects/` during the build. They are not React applications and do not inherit the portfolio's Tailwind styles.

Their browser URLs remain:

- `/projects/livestopair/`
- `/projects/pagesmaxair/`
- `/projects/worksallsday/`
- `/projects/pathstopnow/`
- `/projects/wordsmaxlab/`

Local images, demo links and the favicon respect Vite's base path. For hosting under a subdirectory, build with the matching base, for example `npm run build -- --base=/frontend-portfolio/`, and serve `dist/` from that path. External project links and Unsplash previews retain their original URLs.
