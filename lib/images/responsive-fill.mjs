// Vinext 1.0.1 fill images omit srcSet and otherwise always request 640px.
// Explicit candidates restore native browser size/DPR selection without CSS changes.
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#srcset
export function responsiveFillSourceSet(source){
 if(typeof source!=='string'||!source.startsWith('/images/')||/[?#\\\s]/.test(source)||! /\.(?:jpe?g|png|webp|avif)$/i.test(source))return {};
 return {srcSet:[384,640,750,828,1080,1200,1920].map(width=>`/_next/image?url=${encodeURIComponent(source)}&w=${width}&q=75 ${width}w`).join(', ')};
}
