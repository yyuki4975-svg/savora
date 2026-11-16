// Editorial fixture counts use display labels, not integer database counts.
export function reviewCount(value) {
  const match = /^\s*(\d+(?:\.\d+)?)\s*([km]?)\s*$/i.exec(String(value).replaceAll(',', ''));
  return match ? Number(match[1]) * ({k:1000,m:1000000}[match[2].toLowerCase()] ?? 1) : 0;
}
