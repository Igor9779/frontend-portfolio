import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portfolio CMS Demo — Igor Bondarenko',
  robots: { index: false, follow: false },
}

export default function CmsDemoPage() {
  return (
    <main className="mx-auto w-[calc(100%-40px)] max-w-[1080px] py-20 small-mobile:w-[calc(100%-28px)]">
      <h1 className="text-2xl leading-[1.5] font-bold">
        Portfolio CMS Demo — coming next.
      </h1>
    </main>
  )
}
