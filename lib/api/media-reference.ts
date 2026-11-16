import type { RecipeDetail } from './savora-client';
import { localImage } from '../media/local-media';
// Public DTO media only; identical allowlist for server presentation and kitchen prep.
export function publicRecipeMedia(media:RecipeDetail['primaryMedia']) {
  if (!media) return null;
  if (media.storageKey && /^images\/[a-z0-9][a-z0-9/_-]*\.(?:png|jpe?g|webp)$/i.test(media.storageKey)) return `/${media.storageKey}`;
  if (!media.sourceUrl) return null;
  try {
    const url=new URL(media.sourceUrl);
    if (url.protocol!=='https:' || url.username || url.password) return null;
    if (url.hostname==='upload.wikimedia.org') return localImage(url.href);
    if (url.hostname==='www.themealdb.com') return url.href;
    if (url.hostname==='images.unsplash.com' && /^\/photo-[a-z0-9-]+$/i.test(url.pathname) && ['?auto=format&fit=crop&q=88&w=1200','?auto=format&fit=crop&q=88&w=1400'].includes(url.search)) return url.href;
    return null;
  } catch {return null;}
}
