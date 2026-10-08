'use client'

import { useLocale } from '../lib/use-locale'
import type { Project } from '../types/project'
import { useState } from 'react'

interface ProjectCardProps {
  project: Project
  index?: number
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const { t } = useLocale()
  const [failedImage, setFailedImage] = useState<string | null>(null)
  return (
    <article
      className="group mb-7 grid grid-cols-2 overflow-hidden rounded-[20px] border border-[#ddd] bg-white transition-[transform,translate,box-shadow,border-color] duration-300 ease-[ease] hover:border-[#d2d2d2] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] motion-safe:animate-project-appear motion-safe:hover:-translate-y-[6px] motion-reduce:transition-none mobile:grid-cols-1"
      // Match the original stagger on the first five cards.
      style={{ animationDelay: index < 5 ? `${(index + 1) * 0.08}s` : '0s' }}
    >
      <div className="relative min-h-[360px] overflow-hidden bg-[#e9e9e7] mobile:min-h-[220px] after:pointer-events-none after:absolute after:inset-0 after:bg-black/[0.02] after:transition-colors after:duration-[400ms] after:ease-[ease] after:content-[''] group-hover:after:bg-black/10 motion-reduce:after:transition-none">
        {project.image && failedImage !== project.image ? (
          <img
            loading="lazy"
            src={project.image}
            alt={t('{0} project preview', [project.title])}
            onError={() => setFailedImage(project.image)}
            className="block h-full min-h-[360px] w-full object-cover object-center [transition:transform_0.6s_cubic-bezier(0.2,0.8,0.2,1),filter_0.6s_ease] motion-safe:group-hover:scale-[1.06] group-hover:saturate-[1.08] motion-reduce:transition-none mobile:min-h-[220px]"
          />
        ) : <p className="flex h-full min-h-[220px] items-center justify-center px-6 text-sm text-[#666]">{t('Preview unavailable')}</p>}
      </div>

      <div className="flex min-w-0 flex-col justify-between p-[42px] mobile:p-7">
        <div>
          <p className="mb-[10px] text-[11px] leading-[1.5] font-bold tracking-[0.12em] text-[#777] [overflow-wrap:anywhere]">
            {project.type}
          </p>
          <h3 className="mb-4 text-[32px] leading-[1.5] font-bold tracking-[-0.03em] [overflow-wrap:anywhere] mobile:text-[28px]">
            {project.title}
          </h3>
          <p className="mb-4 max-w-[420px] text-[#666] [overflow-wrap:anywhere]">
            {project.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="max-w-full rounded-full bg-[#f0f0ee] px-[10px] py-[7px] text-xs leading-[1.5] text-[#555] [overflow-wrap:anywhere] transition-[background,transform,translate] duration-200 ease-[ease] group-hover:bg-[#eaeae8] motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 mobile:flex-col mobile:items-stretch">
          {project.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-8 self-start overflow-hidden rounded-[10px] bg-[#111] px-[18px] py-3 text-sm leading-[1.5] font-semibold text-white transition-[transform,translate,box-shadow,background] duration-200 ease-[ease] hover:bg-[#1c1c1c] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] motion-safe:hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4facfe] motion-reduce:transition-none mobile:text-center"
            >
              {t(link.label)}
            </a>
          ))}
        </div>
      </div>
    </article>
  )
}
