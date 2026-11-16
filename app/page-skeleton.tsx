import { Header } from "./ui";

// Shown instantly while a server-rendered page loads (route loading.tsx files). It keeps the
// real header in place, so a click always answers at once and the layout does not jump.
export function PageSkeleton({ variant = "page" }: { variant?: "page" | "recipe" | "grid" }) {
  return <main className="page-skeleton" data-variant={variant} aria-busy="true" aria-live="polite">
    <Header />
    <div className="page-skeleton-body">
      <span className="sr-only">Loading…</span>
      <div className="page-skeleton-hero">
        <div className="page-skeleton-copy"><i data-w="30" /><i data-w="80" data-h="title" /><i data-w="70" /><i data-w="55" /></div>
        <i className="page-skeleton-media" />
      </div>
      <div className="page-skeleton-grid">{Array.from({ length: variant === "recipe" ? 2 : 6 }, (_, index) => <i key={index} />)}</div>
    </div>
  </main>;
}
