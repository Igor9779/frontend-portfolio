export function CmsDemoPromo() {
  return (
    <section
      aria-labelledby="cms-demo-heading"
      className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-[20px] border border-[#ddd] bg-white p-7 mobile:mt-8 mobile:gap-5 mobile:p-6"
    >
      <div className="min-w-0 flex-1 basis-[440px]">
        <p className="mb-2 text-xs leading-[1.5] font-bold tracking-[0.14em] text-[#666]">
          INTERACTIVE DEMO
        </p>
        <h2
          id="cms-demo-heading"
          className="text-[28px] leading-tight font-bold tracking-[-0.03em] mobile:text-2xl"
        >
          Try the Portfolio CMS
        </h2>
        <p className="mt-3 max-w-[650px] text-sm leading-[1.5] text-[#666]">
          Explore the CMS behind this portfolio. Add, edit, reorder and preview
          projects safely in Demo Mode.
        </p>
        <p className="mt-2 text-xs leading-[1.5] text-[#666]">
          No sign-in required · Changes are temporary
        </p>
      </div>
      <a
        href="/cms-demo"
        className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-[10px] bg-[#111] px-[18px] py-3 text-sm leading-[1.5] font-semibold text-white transition-[transform,translate,box-shadow,background] duration-200 ease-[ease] hover:bg-[#1c1c1c] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] motion-safe:hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111] motion-reduce:transition-none"
      >
        Open CMS Demo
      </a>
    </section>
  )
}
