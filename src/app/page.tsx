import { Hero } from '../components/Hero'
import { Projects } from '../components/Projects'
import { Footer } from '../components/Footer'
import { projects } from '../data/projects'

export default function HomePage() {
  return (
    <>
      <Hero />
      <main className="mx-auto w-[calc(100%-40px)] max-w-[1080px] small-mobile:w-[calc(100%-28px)]">
        <Projects projects={projects} />
      </main>
      <Footer />
    </>
  )
}
