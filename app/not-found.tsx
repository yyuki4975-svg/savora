import type { Metadata } from "next";
import { ErrorScene } from "./error-scene";
import { Footer, Header } from "./ui";

// Every unknown URL and every notFound() call lands here.
// https://nextjs.org/docs/app/api-reference/file-conventions/not-found
export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return <main><Header /><ErrorScene kind="not-found" /><Footer /></main>;
}
