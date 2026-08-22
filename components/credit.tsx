export function Credit({ className }: { className?: string }) {
  return (
    <p
      className={`rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-center text-[11px] leading-relaxed text-muted-foreground/70 ${className ?? ""}`}
    >
      Designed &amp; Dev by{" "}
      <a
        href="https://artsandiego.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground underline decoration-dotted underline-offset-2 transition-colors hover:text-signal"
      >
        Art
      </a>{" "}
      and his buddy Claude
    </p>
  )
}
