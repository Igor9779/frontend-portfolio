import type { Project } from '../types/project'

export const projects: Project[] = [
  {
    title: 'AI Radar',
    type: 'AI TOOLS DIRECTORY',
    description:
      'AI tools discovery platform powered by the FreeSerp API with search, categories, sorting, pagination and EN/UA localization.',
    image: '/assets/ai-radar.png',
    imageAlt: 'AI Radar project preview',
    tags: ['React', 'TypeScript', 'Vite', 'Axios'],
    links: [
      {
        label: 'View project →',
        href: 'https://ai-radar-rosy.vercel.app/',
      },
      {
        label: 'GitHub →',
        href: 'https://github.com/Igor9779/ai-radar',
      },
    ],
  },
  {
    title: 'WoT Blitz Session Tracker',
    type: 'NODE.JS / TELEGRAM BOT',
    description:
      'Node.js application for tracking World of Tanks Blitz session statistics using the official Wargaming API. Tracks completed battles, calculates session performance and sends updates through a Telegram bot.',
    image: '/assets/wot.jpg',
    imageAlt: 'WoT Blitz Session Tracker project preview',
    tags: ['Node.js', 'TypeScript', 'SQLite', 'Telegram', 'REST API'],
    links: [
      {
        label: 'GitHub →',
        href: 'https://github.com/Igor9779/wot-bliz-tracker',
      },
      {
        label: 'Telegram →',
        href: 'https://t.me/blitz_session_tracker_bot',
      },
    ],
  },
  {
    title: 'Deutsch Word App',
    type: 'REACT / LANGUAGE LEARNING',
    description:
      'React application for learning German vocabulary through a structured 30-day program. Includes daily word lists, pagination, bookmarks with localStorage persistence and progress completion.',
    image: '/assets/deutch-word-app.png',
    imageAlt: 'Deutsch Word App project preview',
    tags: ['React', 'JavaScript', 'React Router', 'Vite', 'LocalStorage'],
    links: [
      {
        label: 'View project →',
        href: 'https://deutch-word-app.vercel.app/',
      },
      {
        label: 'GitHub →',
        href: 'https://github.com/Igor9779/DeutchWordApp',
      },
    ],
  },
  {
    title: 'Whites Generator',
    type: 'REACT / SITE GENERATOR',
    description:
      'React-based internal tool for generating ready-to-use websites from reusable content sections. Supports single and multi-page generation, dynamic site configuration, random section selection and ZIP export with SEO files and assets.',
    image: '/assets/whites-generator.png',
    imageAlt: 'Whites Generator project preview',
    tags: ['React', 'JavaScript', 'JSZip', 'Bootstrap', 'SEO'],
    links: [
      {
        label: 'View project →',
        href: 'https://igor9779.github.io/whites-generator/',
      },
      {
        label: 'GitHub →',
        href: 'https://github.com/Igor9779/whites-generator',
      },
    ],
  },
  {
    title: 'Domens Tools',
    type: 'REACT / DEVELOPER TOOLS',
    description:
      'Web toolkit for working with domain and content data. Includes a text counter with duplicate and long-line detection, JSON generation, persistent notepad, copy helpers and report handling through a Vercel API.',
    image: '/assets/domens-tools.png',
    imageAlt: 'Domens Tools project preview',
    tags: ['React', 'TypeScript', 'Vite', 'Axios', 'Vercel'],
    links: [
      {
        label: 'View project →',
        href: 'https://domens-tools.vercel.app/',
      },
      {
        label: 'GitHub →',
        href: 'https://github.com/Igor9779/Domens-Tools',
      },
    ],
  },
  {
    title: 'LivesTopAir',
    type: 'MULTI-PAGE WEBSITE',
    description:
      'Responsive multi-page landing website with navigation, pricing and contact pages.',
    image: 'https://images.unsplash.com/photo-1536078101718-d1e8a6f5672a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070',
    imageAlt: 'LivesTopAir project preview',
    tags: ['HTML', 'CSS', 'Bootstrap', 'JavaScript'],
    links: [
      {
        label: 'View project →',
        href: '/projects/livestopair/index.html',
      },
    ],
  },
  {
    title: 'PagesMaxAir',
    type: 'DIGITAL PRODUCT LANDING',
    description:
      'Landing website for digital pages and templates focused on clear planning and organization.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=2070',
    imageAlt: 'PagesMaxAir project preview',
    tags: ['HTML', 'CSS', 'JavaScript'],
    links: [
      {
        label: 'View project →',
        href: '/projects/pagesmaxair/index.html',
      },
    ],
  },
  {
    title: 'WorksAllsDay',
    type: 'PRODUCT LANDING',
    description:
      'Landing website for digital workday structure and productivity templates.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2070&q=80',
    imageAlt: 'WorksAllsDay project preview',
    tags: ['HTML', 'CSS', 'JavaScript'],
    links: [
      {
        label: 'View project →',
        href: '/projects/worksallsday/index.html',
      },
    ],
  },
  {
    title: 'PathsTopNow',
    type: 'PRODUCT LANDING',
    description:
      'Landing website presenting structured paths and productivity-oriented digital modules.',
    image: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2071',
    imageAlt: 'PathsTopNow project preview',
    tags: ['HTML', 'CSS', 'JavaScript'],
    links: [
      {
        label: 'View project →',
        href: '/projects/pathstopnow/index.html',
      },
    ],
  },
  {
    title: 'WordsMaxLab',
    type: 'EDUCATIONAL LANDING',
    description:
      'Landing website for a compact vocabulary-learning product with structured modules.',
    image: '/assets/wordsmaxlab.png',
    imageAlt: 'WordsMaxLab project preview',
    tags: ['HTML', 'CSS', 'JavaScript'],
    links: [
      {
        label: 'View project →',
        href: '/projects/wordsmaxlab/index.html',
      },
    ],
  },
]
