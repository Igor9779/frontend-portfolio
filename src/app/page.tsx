import { connection } from 'next/server'
import { Hero } from '../components/Hero'
import { Projects } from '../components/Projects'
import { Footer } from '../components/Footer'
import { CmsDemoPromo } from '../components/CmsDemoPromo'
import { getProjects } from '../lib/projects'

export default async function HomePage() {
  await connection()
  const projects = await getProjects()

  return (
    <>
      <Hero />
      <main className="mx-auto w-[calc(100%-40px)] max-w-[1080px] small-mobile:w-[calc(100%-28px)]">
        <CmsDemoPromo />
        <Projects projects={projects} />
      </main>
      <Footer />
    </>
  )
}
