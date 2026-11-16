import { configuration, sessionCookie, boundedText, privateResponse, responseCookies, trustedClientIp } from './account-boundary.mjs';
const id = '[a-f0-9-]{36}', slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
const routes = [
  ['me/kitchen', ['GET'], ['after','limit']],
  ['me/kitchen/workspace', ['GET','POST'], []],
  ['me/kitchen/import(?:-preview)?', ['POST'], []],
  [`me/kitchen/${slug}`, ['PUT','DELETE'], []],
  ['submissions', ['GET','POST'], ['after','limit']],
  ['submissions/review-queue', ['GET'], ['after','limit']],
  [`submissions/${id}`, ['GET','PUT'], []],
  [`submissions/${id}/review`, ['GET','POST'], []],
  [`submissions/${id}/(?:submit|publish|withdraw)`, ['POST'], []],
  ['community/posts', ['GET','POST'], ['space','saved','recipe','after','limit']],
  [`community/posts/${id}/replies`, ['GET','POST'], ['after','limit']],
  [`community/posts/${id}/marks`, ['PUT'], []],
  [`community/posts/${id}/reports`, ['POST'], []],
  [`community/posts/${id}`, ['DELETE'], []],
  ['community/reports', ['GET'], ['after','limit']],
  [`community/reports/${id}`, ['POST'], []],
];
const problem = (status, code) => privateResponse({status, code}, status);
// Only fixed first-party routes. No browser-supplied origin/base URL or identity headers.
export async function productRequest(request, path, env, transport = fetch) {
  let config;
  try { config = configuration(env); } catch { return problem(503, 'ProductUnavailable'); }
  const route = routes.find(([pattern, methods]) => new RegExp(`^${pattern}$`).test(path) && methods.includes(request.method));
  if (!route) return problem(404, 'InvalidRoute');
  const url = new URL(request.url), read = request.method === 'GET';
  if (url.origin !== config.origin || request.headers.get('sec-fetch-site') === 'cross-site' ||
    (request.headers.has('origin') && request.headers.get('origin') !== config.origin) ||
    (!read && (request.headers.get('origin') !== config.origin || request.headers.get('x-savora-request') !== '1'))) return problem(403, 'InvalidOrigin');
  const seen = new Set();
  for (const [key, value] of url.searchParams) {
    if (!route[2].includes(key) || !read || seen.has(key) || value.length > 160) return problem(422, 'InvalidQuery');
    seen.add(key);
  }
  const cookie = sessionCookie(request, config.secure);
  const publicRead = read && (path === 'community/posts' || /^community\/posts\/[^/]+\/replies$/.test(path));
  if (!cookie && !publicRead) return problem(401, 'Unauthenticated');
  const headers = new Headers({Accept:'application/json'});
  try {const ip=trustedClientIp(request,config);if(ip)headers.set('X-Savora-Client-IP',ip);}
  catch {return problem(503,'ProductUnavailable');}
  if (cookie) headers.set('Cookie',cookie);
  let body;
  if (!read) {
    if (request.headers.get('content-encoding') && request.headers.get('content-encoding') !== 'identity') return problem(415,'UnsupportedEncoding');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) return problem(415,'JsonRequired');
    const csrf = request.headers.get('x-savora-csrf'), key = request.headers.get('x-idempotency-key');
    if (!/^[A-Za-z0-9_-]{43}$/.test(csrf ?? '')) return problem(403,'InvalidCsrf');
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(key ?? '')) return problem(422,'InvalidIdempotencyKey');
    try {
      body = await boundedText(request.body, 24576);
      const input = JSON.parse(body);
      if (!input || typeof input !== 'object' || Array.isArray(input)) return problem(422,'InvalidInput');
    } catch (error) { return problem(error.message === 'SizeLimit' ? 413 : 400, error.message === 'SizeLimit' ? 'BodyTooLarge' : 'InvalidJson'); }
    headers.set('Content-Type','application/json'); headers.set('Origin',config.origin);
    headers.set('X-Savora-Request','1'); headers.set('X-Savora-Csrf',csrf); headers.set('X-Idempotency-Key',key);
  }
  try {
    const target = new URL(`v1/${path}`, config.base); target.search = url.search;
    const upstream = await transport(target, {method:request.method,headers,body,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(18000)});
    if (![200,201,202,204,400,401,403,404,409,413,415,422,429,503].includes(upstream.status) || responseCookies(upstream.headers).length) return problem(503,'ProductUnavailable');
    if (upstream.status === 204) return new Response(null, {status:204,headers:privateResponse({}).headers});
    const payload = JSON.parse(await boundedText(upstream.body, 524288));
    if (!upstream.ok) {
      // Return only a bounded machine code; never SQL, stack traces or private error details.
      const response = problem(upstream.status, /^[A-Z][A-Za-z]{1,48}$/.test(payload?.code ?? '') ? payload.code : 'ProductUnavailable');
      const retry = upstream.headers.get('retry-after');
      if (/^\d{1,5}$/.test(retry ?? '')) response.headers.set('Retry-After',retry);
      return response;
    }
    // API controllers own explicit product DTOs, never database rows. Fail closed on sensitive fields.
    JSON.stringify(payload, (key, value) => {
      if (/^(?:password|passwordHash|password_hash|token|csrfToken|email|session|payload_hash|owner_id|reporter_id|connectionString)$/i.test(key)) throw new Error('PrivateField');
      return value;
    });
    return privateResponse(payload,upstream.status);
  } catch { return problem(503,'ProductUnavailable'); }
}
