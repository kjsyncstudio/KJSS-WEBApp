// Company mark — crossfades with theme. Black mark on light, white mark on dark.
// Both images overlap; opacity transitions when <html class="dark"> flips.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <img src="/kjss-mark-light.png" alt="KJ Sync Studio"
        className="absolute inset-0 w-full h-full object-contain opacity-100 dark:opacity-0 transition-opacity duration-300" />
      <img src="/kjss-mark-dark.png" alt="KJ Sync Studio" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain opacity-0 dark:opacity-100 transition-opacity duration-300" />
    </span>
  )
}
