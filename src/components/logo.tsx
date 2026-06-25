// Company mark — swaps with theme. Dark mark on light bg, white mark on dark bg.
// No JS needed: the `dark:` classes follow the <html class="dark"> from next-themes.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <>
      <img src="/kjss-mark-light.png" alt="KJ Sync Studio" className={`${className} block dark:hidden`} />
      <img src="/kjss-mark-dark.png" alt="KJ Sync Studio" className={`${className} hidden dark:block`} />
    </>
  )
}
