import { ErrorScene } from "./error-scene";

/** The published catalogue did not answer (map, places, dish guides). */
export function CatalogApiStatus({ message, backHref, backLabel }: { message: string; backHref: string; backLabel: string }) {
  return <ErrorScene kind="unavailable" message={message} back={{ href: backHref, label: backLabel }} />;
}
