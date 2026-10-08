import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { LocalizedText } from '../components/LanguageSwitcher'

const title = 'Igor Bondarenko — Frontend Developer'
const description = 'Selected frontend projects built with React, TypeScript and JavaScript. Explore the portfolio and try its interactive CMS demo.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'website', locale: 'en_US', alternateLocale: ['uk_UA', 'ru_RU'] },
  twitter: { card: 'summary', title, description },
  icons: {
    icon: { url: '/favicon.png', type: 'image/png' },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="fixed top-3 left-3 z-[100] -translate-y-[200%] rounded-md bg-white px-4 py-3 text-sm text-zinc-900 shadow-md focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900"><LocalizedText>Skip to content</LocalizedText></a>
        {children}
      </body>
    </html>
  )
}
