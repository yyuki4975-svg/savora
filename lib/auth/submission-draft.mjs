export function toSubmission(draft) {
  const lines = value => value.split('\n').map(v => v.trim()).filter(Boolean);
  const ingredients = lines(draft.ingredients).map(line => {
    const split = line.indexOf('|');
    if (split < 1 || !line.slice(split + 1).trim()) throw new Error('Write each ingredient as quantity | ingredient. No units are guessed.');
    return {quantity:line.slice(0,split).trim(),name:line.slice(split + 1).trim()};
  });
  const sources = lines(draft.sources).map(line => {
    const urls = line.match(/https:\/\/[^\s<>]+/g);
    if (!urls || urls.length !== 1) throw new Error('Each source line needs one full HTTPS URL.');
    const url = new URL(urls[0]);
    if (url.username || url.password) throw new Error('Source URLs must not contain credentials.');
    return url.href;
  });
  return {title:draft.name,locale:draft.locale || 'en',place:[draft.city,draft.region,draft.country].filter(Boolean).join(', '),story:draft.story,
    servings:Number(draft.servings || 1),ingredients,steps:lines(draft.steps),sources,rightsConfirmed:draft.rights,
    details:{localName:draft.localName,country:draft.country,region:draft.region,city:draft.city,kind:draft.kind,allergens:draft.allergens,dietary:draft.dietary,sourcesText:draft.sources}};
}
export function fromSubmission(content) {
  const {sourcesText,...details} = content.details ?? {};
  return {name:content.title,locale:content.locale,servings:content.servings,localName:'',country:content.place,region:'',city:'',kind:'Family recipe',
    story:content.story,ingredients:content.ingredients.map(i => `${i.quantity} | ${i.name}`).join('\n'),steps:content.steps.join('\n'),
    allergens:'',dietary:'',rights:content.rightsConfirmed,...details, sources:sourcesText ?? content.sources.join('\n')};
}
