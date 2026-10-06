import type { Project } from '../types/project'
import { ProjectCard } from './ProjectCard'

interface ProjectsProps {
  projects: Project[]
}

export function Projects({ projects }: ProjectsProps) {
  return (
    <section aria-labelledby="projects-heading" className="py-20 mobile:py-[60px]">
      <div className="mb-8">
        <p className="mb-3 text-xs leading-[1.5] font-bold tracking-[0.14em] text-[#777]">
          SELECTED WORK
        </p>
        <h2
          id="projects-heading"
          className="text-[38px] leading-[1.5] font-bold tracking-[-0.03em]"
        >
          Projects
        </h2>
      </div>

      {projects.length === 0 && (
        <p className="text-[#666]">No projects to display yet.</p>
      )}

      {projects.map((project, index) => (
        <ProjectCard key={project.title} project={project} index={index} />
      ))}
    </section>
  )
}
