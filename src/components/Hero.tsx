export function Hero() {
  return (
    <header
      className="relative overflow-hidden bg-[#111] bg-hero-grid pt-24 pb-20 text-white [background-size:40px_40px,40px_40px,auto,auto] mobile:pt-[70px] mobile:pb-[60px] mobile:[background-size:30px_30px,30px_30px,auto,auto] after:pointer-events-none after:absolute after:top-[-260px] after:right-[-220px] after:size-[500px] after:rounded-full after:bg-[#508cff]/[0.08] after:blur-[80px] after:content-['']"
    >
      <div className="mx-auto w-[calc(100%-40px)] max-w-[1080px] small-mobile:w-[calc(100%-28px)] before:mb-6 before:block before:h-1 before:w-[60px] before:rounded-full before:bg-[linear-gradient(90deg,#4facfe,#8f6cff)] before:content-['']">
        <p className="mb-3 text-xs leading-[1.5] font-bold tracking-[0.14em] text-[#aaa]">
          FRONTEND DEVELOPER
        </p>

        <h1 className="mb-[18px] text-[clamp(42px,7vw,76px)] leading-[0.98] font-bold tracking-[-0.04em] mobile:text-[clamp(42px,13vw,64px)]">
          Igor Bondarenko
        </h1>

        <p className="max-w-[650px] text-xl leading-[1.5] text-[#c7c7c7] mobile:text-lg">
          Frontend developer building web interfaces, internal tools and
          interactive applications with React, TypeScript and JavaScript.
        </p>

        <nav
          aria-label="Social links"
          className="mt-8 flex items-center gap-3 mobile:mt-7 small-mobile:flex-col small-mobile:items-start small-mobile:gap-[10px]"
        >
          <a
            href="https://t.me/DarthHoit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-[120px] items-center justify-center rounded-[10px] border border-[#2aabee]/45 bg-[#2aabee]/[0.12] px-[18px] py-[11px] text-[15px] leading-[1.5] font-semibold tracking-[0.01em] backdrop-blur-[8px] transition-[transform,translate,background,border-color,box-shadow] duration-200 ease-[ease] hover:border-[#2aabee]/80 hover:bg-[#2aabee]/20 hover:shadow-[0_8px_24px_rgba(42,171,238,0.18)] motion-safe:hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4facfe] motion-reduce:transition-none small-mobile:min-w-[130px] small-mobile:px-4 small-mobile:py-[10px] small-mobile:text-sm"
          >
            Telegram ↗
          </a>
          <a
            href="https://github.com/Igor9779"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-[120px] items-center justify-center rounded-[10px] border border-white/22 bg-white/[0.08] px-[18px] py-[11px] text-[15px] leading-[1.5] font-semibold tracking-[0.01em] backdrop-blur-[8px] transition-[transform,translate,background,border-color,box-shadow] duration-200 ease-[ease] hover:border-white/40 hover:bg-white/[0.14] hover:shadow-[0_8px_24px_rgba(255,255,255,0.08)] motion-safe:hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4facfe] motion-reduce:transition-none small-mobile:min-w-[130px] small-mobile:px-4 small-mobile:py-[10px] small-mobile:text-sm"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  )
}
