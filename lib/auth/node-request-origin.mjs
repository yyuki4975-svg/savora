// Native Next's standalone adapter constructs internal 0.0.0.0:<PORT> URLs.
// Restore the existing configured public origin ONLY behind the fixed ingress;
// do not remove/relax the account/product/public-BFF origin or CSRF checks.
export function nodeRequestOrigin(request, env = process.env) {
  if (env.NODE_ENV !== 'production' || env.SAVORA_NATIVE_REQUEST_ORIGIN !== 'true') return request;
  try {
    const expected = new URL(env.SAVORA_ACCOUNT_WEB_ORIGIN);
    const actual = new URL(request.url);
    if (actual.origin === expected.origin) return request;
    if (expected.protocol !== 'https:' || expected.username || expected.password || expected.search || expected.hash || expected.pathname !== '/') return request;
    if (!['http:','https:'].includes(actual.protocol) || actual.hostname !== '0.0.0.0' || actual.port !== (env.PORT || '3000')) return request;
    if (request.headers.get('host') !== expected.host || request.headers.get('x-forwarded-host') !== expected.host || request.headers.get('x-forwarded-proto') !== 'https') return request;
    // Preserve the incoming Origin, Cookie, CSRF, method and body for the normal
    // boundary to validate. Forwarding headers are still stripped downstream.
    return new Request(expected.origin + actual.pathname + actual.search, request);
  } catch { return request; }
}
