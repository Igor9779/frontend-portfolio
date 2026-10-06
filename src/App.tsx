import { Hero } from './components/Hero'
import { Projects } from './components/Projects'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <>
      <Hero />
      <main className="mx-auto w-[calc(100%-40px)] max-w-[1080px] small-mobile:w-[calc(100%-28px)]">
        <Projects />
      </main>
      <Footer />
    </>
  )
}
