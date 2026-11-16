// Repository-local photographs of the pinned HowToCook revision. The repository LICENSE is
// https://github.com/Anduin2017/HowToCook/blob/3dfa950f6daf0a5b311fc46619f1b559bac980c4/LICENSE
// Owner instruction (2026-10-12): data-source photographs are usable by default, so photos are no longer
// pre-registered per recipe. Each photo must still be an exact blob of the pinned revision that sits in the
// recipe's own folder (dishes/<category>/<name>/<file>), with consistent URLs, hash and local storage key.
// Externally linked images and other commits remain outside this policy.
import type { PublicationMediaAsset } from './recipe-publication-package';
const revision='3dfa950f6daf0a5b311fc46619f1b559bac980c4';
const rawPrefix=`https://raw.githubusercontent.com/Anduin2017/HowToCook/${revision}/`;
const segment=/^[^\\/\u0000-\u001f]{1,200}$/u;
export function matchesHowToCookPhotoPolicy(media:PublicationMediaAsset,slug:string):boolean {
  if(!slug.startsWith('howtocook-')||!media.SourceUrl?.startsWith(rawPrefix))return false;
  let parts:string[];
  try{parts=media.SourceUrl.slice(rawPrefix.length).split('/').map(decodeURIComponent);}catch{return false;}
  if(parts.length!==4||parts[0]!=='dishes'||!/^[a-z_-]{2,40}$/.test(parts[1]!))return false;
  const [,category,name,file]=parts as [string,string,string,string];
  if(![name,file].every(p=>segment.test(p)&&p!=='.'&&p!=='..')||!/\.(?:jpe?g|png|webp)$/i.test(file))return false;
  const folder=`dishes/${category}/${name}`;
  const encode=(p:string)=>p.split('/').map(encodeURIComponent).join('/');
  return media.Provider==='HowToCook repository'&&media.ContentType==='image/jpeg'&&
    media.Creator==='HowToCook repository contributors (photographer not separately identified)'&&
    media.LicenseCode==='Unlicense'&&media.LicenseUrl===`https://github.com/Anduin2017/HowToCook/blob/${revision}/LICENSE`&&
    media.LandingPageUrl===`https://github.com/Anduin2017/HowToCook/blob/${revision}/${encode(folder+'/'+name+'.md')}`&&
    media.SourceUrl===`${rawPrefix}${encode(folder+'/'+file)}`&&
    media.ExternalId===revision+':'+folder+'/'+file&&media.StorageKey===`images/dishes/${slug}.jpg`&&
    media.Sha256!==null&&Math.max(media.Width,media.Height)>=960;
}
