import { cn } from '@/lib/utils'

/** Isotipo de TocToc (campana). Usa colores de marca via tokens (fill-primary). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-8', className)} role="img" aria-label="TocToc">
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <path
        d="M32 14a3 3 0 0 1 3 3v1.2a11 11 0 0 1 8 10.55v6.05l2.45 4.3A2 2 0 0 1 43.7 42H20.3a2 2 0 0 1-1.75-2.9L21 34.8v-6.05a11 11 0 0 1 8-10.55V17a3 3 0 0 1 3-3Z"
        className="fill-primary-foreground"
      />
      <path d="M27 46a5 5 0 0 0 10 0Z" className="fill-primary-foreground" />
    </svg>
  )
}
