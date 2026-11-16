import type { ReactNode } from "react";
import { requireLocalReview } from "../internal-only";

// Local review only: every route below returns 404 in a production build.
export default function LocalReviewLayout({ children }: { children: ReactNode }) {
  requireLocalReview();
  return children;
}
