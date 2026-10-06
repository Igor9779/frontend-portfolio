'use client'

export default function PortfolioError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto w-[calc(100%-40px)] max-w-[1080px] py-20 small-mobile:w-[calc(100%-28px)]">
      <h1 className="mb-4 text-2xl leading-[1.5] font-bold">
        Projects are temporarily unavailable.
      </h1>
      <p role="alert" className="mb-6 text-[#666]">
        The portfolio could not be loaded. Please try again shortly.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-[10px] bg-[#111] px-[18px] py-3 text-sm font-semibold text-white hover:bg-[#1c1c1c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4facfe]"
      >
        Try again
      </button>
    </main>
  )
}
