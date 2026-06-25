// Company mark — swaps with theme. Dark mark on light bg, white mark on dark bg.
// No JS needed: the `dark:` classes follow the <html class="dark"> from next-themes.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <>
      <img src="/kjss-mark-light.png" alt="Sync Studios" className={`${className} block dark:hidden`} />
      <img src="/kjss-mark-dark.png" alt="Sync Studios" className={`${className} hidden dark:block`} />
    </>
  )
}
