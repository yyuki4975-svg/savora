// Serve Wikimedia Commons photographs from Savora's own origin when a local copy exists.
// Copies are produced by scripts/localize-commons-media.mjs; credits and source links stay
// in the editorial data. Unknown or non-Commons URLs are returned unchanged.
import paths from "./commons-paths.json";

const localCopies = paths as Record<string, string>;

function commonsKey(name: string) {
  let value = name;
  try { value = decodeURIComponent(name); } catch { /* already decoded */ }
  value = value.replace(/^File:/i, "").replaceAll(" ", "_").trim();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function commonsFileName(src: string): string | null {
  const redirect = /commons\.wikimedia\.org\/wiki\/Special:(?:Redirect\/file|FilePath)\/([^?#]+)/.exec(src);
  if (redirect) return commonsKey(redirect[1]);
  const upload = /upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/.exec(src);
  return upload ? commonsKey(upload[1]) : null;
}

/** Local path for a Commons image when it has been mirrored; otherwise the original URL. */
export function localImage(src: string): string {
  const key = commonsFileName(src);
  return (key && localCopies[key]) || src;
}

/** Local path for a Commons file title (as used by the autumn table and culture pools). */
export function localCommonsFile(file: string, fallback: string): string {
  return localCopies[commonsKey(file)] ?? fallback;
}
