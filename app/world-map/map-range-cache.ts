import type { Source, RangeResponse } from "pmtiles";

// Content identity is checked against the original approved asset by regression.
export const BUILTIN_BASEMAP = "/maps/savora-basemap.pmtiles?v=d0b5f3d471aac729d99c32cf96ba4631cb5ddb2916e422646fbc156c71a03e7b";
// Same approved bytes, immutable content-addressed public CDN object. The .bin
// extension is cacheable on Cloudflare without a whole-site Cache Everything rule.
export const CDN_BASEMAP = "https://assets.cookwsavora.com/maps/d0b5f3d471aac729d99c32cf96ba4631cb5ddb2916e422646fbc156c71a03e7b/savora-basemap.bin";
export function isBuiltinBasemap(url: string) { return url === BUILTIN_BASEMAP || url === CDN_BASEMAP; }
export const MAP_RANGE_LIMITS = Object.freeze({ bytes: 8 * 1024 ** 2, entries: 64, entryBytes: 2 * 1024 ** 2 });

// Cache ONLY the version-pinned public basemap, never private requests or a
// mutable operator-supplied remote archive. No persistent storage or retries.
export function cacheMapRanges(source: Source, overview?: Promise<ArrayBuffer | undefined>): Source {
  const url = new URL(source.getKey());
  if (!/^https?:$/.test(url.protocol) || url.username || url.password ||
      (url.pathname + url.search !== BUILTIN_BASEMAP && url.href !== CDN_BASEMAP) || url.hash) throw new Error("Only the version-pinned public basemap can be cached");
  const cache = new Map<string, RangeResponse>();
  let bytes = 0;
  return {
    getKey: () => source.getKey(),
    async getBytes(offset, length, signal, etag) {
      signal?.throwIfAborted();
      const initial = overview ? await overview : undefined;
      signal?.throwIfAborted();
      if (initial && !etag && offset >= 0 && length > 0 && offset + length <= initial.byteLength) {
        return { data: initial.slice(offset, offset + length) };
      }
      const key = `${offset}:${length}`;
      const hit = cache.get(key);
      if (hit && (!etag || hit.etag === etag)) {
        cache.delete(key); cache.set(key, hit);
        // Map workers may transfer/detach returned buffers. Never expose the
        // retained buffer itself, even for a currently uncompressed tile.
        return { ...hit, data: hit.data.slice(0) };
      }
      const response = await source.getBytes(offset, length, signal, etag);
      signal?.throwIfAborted();
      if (response.data.byteLength && response.data.byteLength <= MAP_RANGE_LIMITS.entryBytes) {
        if (hit) { bytes -= hit.data.byteLength; cache.delete(key); }
        while (cache.size && (bytes + response.data.byteLength > MAP_RANGE_LIMITS.bytes || cache.size >= MAP_RANGE_LIMITS.entries)) {
          const oldest = cache.keys().next().value!;
          bytes -= cache.get(oldest)!.data.byteLength; cache.delete(oldest);
        }
        const stored = { ...response, data: response.data.slice(0) };
        cache.set(key, stored); bytes += stored.data.byteLength;
      }
      return response;
    },
  };
}
