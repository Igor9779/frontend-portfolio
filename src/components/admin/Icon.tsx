const paths = {
  plus: 'M12 5v14M5 12h14',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  arrowUp: 'M12 19V5m-6 6 6-6 6 6',
  arrowDown: 'M12 5v14m-6-6 6 6 6-6',
  edit: 'm16 3 5 5M4 16 16 4a3 3 0 0 1 4 4L8 20H4v-4Z',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  external: 'M14 3h7v7M21 3 10 14M10 3H4v17h17v-6',
  folder: 'M3 5h6l2 3h10v12H3V5Z',
  grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  close: 'm6 6 12 12M6 18 18 6',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 5v2',
} as const

export function Icon({ name, className = 'h-4 w-4' }: {
  name: keyof typeof paths
  className?: string
}) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name]} />
    </svg>
  )
}
