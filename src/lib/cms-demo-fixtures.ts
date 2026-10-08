import type { AdminProject } from '../types/admin-project'
import type { ProjectFormPrefill } from '../types/project-form'
import type { AiProjectSuggestions } from '../types/ai-autofill'
import { parseGithubRepository } from './github-repository'

export interface DemoRepositoryFixture {
  repository: string
  githubUrl: string
  productionUrl: string
  previewAsset: string
  importFields: ProjectFormPrefill
  suggestions: AiProjectSuggestions
}

// Authored from the verified MUSE regression evidence. No repository is read
// at runtime, and these samples never describe live AI/backend functionality.
export const museDemoFixture: DemoRepositoryFixture = {
  repository: 'igor9779/ai-creator',
  githubUrl: 'https://github.com/Igor9779/ai-creator',
  productionUrl: 'https://muse-ai-creator-showcase.vercel.app/',
  previewAsset: '/assets/cms-demo/muse-preview.jpg',
  importFields: {
    githubRepository: 'igor9779/ai-creator', title: 'ai-creator',
    githubUrl: 'https://github.com/Igor9779/ai-creator',
    productionUrl: 'https://muse-ai-creator-showcase.vercel.app/',
    shortDescription: 'MUSE — AI Creator Showcase, a frontend showcase with fictional creator profiles and scripted mock chat.',
    description: 'MUSE — AI Creator Showcase, a frontend showcase with fictional creator profiles and scripted mock chat.',
    technologies: ['TypeScript', 'CSS', 'HTML'],
  },
  suggestions: {
    title: 'MUSE — AI Creator Showcase', category: 'Frontend Showcase',
    shortDescription: 'A multilingual frontend showcase with fictional creator profiles and scripted mock chat.',
    description: 'MUSE presents fictional creator profiles through a responsive, mobile-first interface with profile views, a mock social feed, local likes and scripted mock chat. Built with React and TypeScript, it supports Telegram Mini App use and EN/UA/RU localization. It runs as a frontend showcase without a backend, database, authentication or payments, and makes no live AI API calls.',
    technologies: ['React', 'TypeScript', 'Vite', 'Tailwind CSS'],
  },
}

export function findDemoRepository(url: string): DemoRepositoryFixture | null {
  return parseGithubRepository(url)?.repository === museDemoFixture.repository ? museDemoFixture : null
}

export function findDemoPreview(productionUrl: string): DemoRepositoryFixture | null {
  // Fixture matching only: this value is never used as a fetch target.
  try { return new URL(productionUrl).href === museDemoFixture.productionUrl ? museDemoFixture : null }
  catch { return null }
}

export function demoImportFields(fixture: DemoRepositoryFixture): ProjectFormPrefill {
  return { ...fixture.importFields, technologies: [...fixture.importFields.technologies] }
}

export function demoAiSuggestions(fixture: DemoRepositoryFixture): AiProjectSuggestions {
  return { ...fixture.suggestions, technologies: [...fixture.suggestions.technologies] }
}

// Three reviewed public samples copied from the committed portfolio seed.
// Local images only. Demo IDs are independent of production record identities.
export const initialDemoProjects: AdminProject[] = [
  {
    id: 'd1300000-0000-4000-8000-000000000001', position: 0, visible: true,
    title: 'AI Radar', category: 'AI TOOLS DIRECTORY', shortDescription: null,
    description: 'AI tools discovery platform powered by the FreeSerp API with search, categories, sorting, pagination and EN/UA localization.',
    previewUrl: '/assets/ai-radar.png', githubUrl: 'https://github.com/Igor9779/ai-radar',
    productionUrl: 'https://ai-radar-rosy.vercel.app/', telegramUrl: null,
    technologies: ['React', 'TypeScript', 'Vite', 'Axios'],
  },
  {
    id: 'd1300000-0000-4000-8000-000000000002', position: 1, visible: true,
    title: 'Deutsch Word App', category: 'REACT / LANGUAGE LEARNING', shortDescription: null,
    description: 'React application for learning German vocabulary through a structured 30-day program. Includes daily word lists, pagination, bookmarks with localStorage persistence and progress completion.',
    previewUrl: '/assets/deutch-word-app.png', githubUrl: 'https://github.com/Igor9779/DeutchWordApp',
    productionUrl: 'https://deutch-word-app.vercel.app/', telegramUrl: null,
    technologies: ['React', 'JavaScript', 'React Router', 'Vite', 'LocalStorage'],
  },
  {
    id: 'd1300000-0000-4000-8000-000000000003', position: 2, visible: true,
    title: 'Domens Tools', category: 'REACT / DEVELOPER TOOLS', shortDescription: null,
    description: 'Web toolkit for working with domain and content data. Includes a text counter with duplicate and long-line detection, JSON generation, persistent notepad, copy helpers and report handling through a Vercel API.',
    previewUrl: '/assets/domens-tools.png', githubUrl: 'https://github.com/Igor9779/Domens-Tools',
    productionUrl: 'https://domens-tools.vercel.app/', telegramUrl: null,
    technologies: ['React', 'TypeScript', 'Vite', 'Axios', 'Vercel'],
  },
]
