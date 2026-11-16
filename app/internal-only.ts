import { notFound } from "next/navigation";

/** Local review tools (phase-3 previews, asset review, asset library) are not part of a production build. */
export function requireLocalReview() {
  if (!import.meta.env.DEV) notFound();
}
