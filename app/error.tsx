"use client";

import { ErrorScene } from "./error-scene";
import { Footer, Header } from "./ui";

// Route-level error boundary: the header and footer stay usable, and "Try again" re-renders the segment.
// The digest is the server log reference; error messages themselves are never shown to visitors.
// https://nextjs.org/docs/app/api-reference/file-conventions/error
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main><Header /><ErrorScene kind="error" reference={error.digest} onRetry={reset} /><Footer /></main>;
}
