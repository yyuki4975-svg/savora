// Same-origin BFF. Never forward browser-supplied identity or proxy headers.
// https://nextjs.org/docs/app/api-reference/file-conventions/route
const actions = new Set(['register', 'login', 'logout', 'verify-email', 'resend-verification', 'forgot-password', 'reset-password']);
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
// UX validation only; the Node API independently enforces the same policy.
export function validNewPassword(value) {
  if (typeof value !== 'string' || /[\x00-\x1f\x7f]/.test(value)) return false;
  const length = [...value].length;
  return length <= 128 && (length >= 15 || (length >= 8 && /[a-z]/.test(value) && /[0-9]/.test(value)));
}
export function privateResponse(value, status = 200) {
  return Response.json(value, { status, headers: {
    'Cache-Control': 'no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  } });
}
function problem(status, code) { return privateResponse({ status, code }, status); }
// Preserve separate cookies, including Expires commas; never split a folded header.
// https://developers.cloudflare.com/workers/runtime-apis/headers/#getall-method
export function responseCookies(headers) {
  const cookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie()
    : typeof headers.getAll === 'function' ? headers.getAll('Set-Cookie')
    : !headers.has('set-cookie') ? [] : null;
  if (!Array.isArray(cookies) || cookies.some(value => typeof value !== 'string')) throw new Error('UnsupportedCookieHeaders');
  return cookies;
}
export function configuration(env) {
  if (env.SAVORA_ACCOUNT_API_ENABLED !== 'true') throw new Error('Disabled');
  const origin = new URL(env.SAVORA_ACCOUNT_WEB_ORIGIN);
  const base = new URL(env.SAVORA_ACCOUNT_API_BASE_URL);
  for (const url of [origin, base]) {
    const local = env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('InvalidConfig');
  }
  const trustedClientIp = env.SAVORA_TRUSTED_CLIENT_IP === 'true';
  if (env.SAVORA_TRUSTED_CLIENT_IP !== undefined && !['true','false'].includes(env.SAVORA_TRUSTED_CLIENT_IP)) throw new Error('InvalidProxyPolicy');
  if (trustedClientIp && (env.NODE_ENV !== 'production' || origin.origin !== 'https://cookwsavora.com' || base.origin !== 'https://api.cookwsavora.com')) throw new Error('InvalidProxyPolicy');
  return { origin: origin.origin, base, secure: origin.protocol === 'https:', trustedClientIp };
}
// The loopback-only production web ingress MUST overwrite this one field from
// the TCP peer. Never forward incoming X-Forwarded-For, Forwarded or CF headers.
// https://expressjs.com/en/guide/behind-proxies/
export function trustedClientIp(request, config) {
  if (!config.trustedClientIp) return null;
  const value=request.headers.get('x-savora-client-ip');
  if (!value || value.length>45 || value.trim()!==value || !/^[A-Fa-f0-9:.]+$/.test(value)) throw new Error('InvalidClientIp');
  if (!value.includes(':')) {
    const parts=value.split('.');
    if(parts.length!==4 || parts.some(p=>! /^(0|[1-9][0-9]{0,2})$/.test(p) || Number(p)>255)) throw new Error('InvalidClientIp');
    return value;
  }
  const url=new URL(`http://[${value}]/`);
  if(!url.hostname.startsWith('[')||!url.hostname.endsWith(']'))throw new Error('InvalidClientIp');
  return url.hostname.slice(1,-1);
}
export function sessionCookie(request, secure) {
  const name = secure ? '__Host-savora-sid' : 'savora-sid';
  const matches = (request.headers.get('cookie') ?? '').split(';').map(v => v.trim()).filter(v => v.startsWith(`${name}=`));
  if (matches.length !== 1 || !tokenPattern.test(matches[0].slice(name.length + 1))) return null;
  return matches[0];
}
export async function boundedText(stream, limit) {
  if (!stream) return '';
  const reader = stream.getReader();
  const parts = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new Error('SizeLimit'); }
      parts.push(value);
    }
    const buffer = new Uint8Array(bytes); let offset = 0;
    for (const part of parts) { buffer.set(part, offset); offset += part.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } finally { reader.releaseLock(); }
}
function validCookie(cookie, secure, action) {
  const name = secure ? '__Host-savora-sid' : 'savora-sid';
  const fields = cookie.split(';').map(v => v.trim());
  const expected = action === 'logout' ? `${name}=` : new RegExp(`^${name}=[A-Za-z0-9_-]{43}$`);
  return (typeof expected === 'string' ? fields[0] === expected : expected.test(fields[0])) &&
    fields.some(v => /^HttpOnly$/i.test(v)) && fields.some(v => /^SameSite=Lax$/i.test(v)) &&
    fields.some(v => v === 'Path=/') && !fields.some(v => /^Domain\s*=/i.test(v)) &&
    (!secure || fields.some(v => /^Secure$/i.test(v)));
}
export async function accountRequest(request, action, env, transport = fetch) {
  let config;
  try { config = configuration(env); } catch { return problem(503, 'AccountsUnavailable'); }
  const read = request.method === 'GET';
  if ((read && action !== 'session') || (!read && (request.method !== 'POST' || !actions.has(action)))) return problem(405, 'MethodNotAllowed');
  if (new URL(request.url).search) return problem(400, 'InvalidQuery');
  if (new URL(request.url).origin !== config.origin) return problem(403, 'InvalidOrigin');
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin !== null && origin !== config.origin) ||
    (!read && (origin !== config.origin || request.headers.get('x-savora-request') !== '1'))) return problem(403, 'InvalidOrigin');
  const headers = new Headers({ Accept: 'application/json' });
  try { const ip=trustedClientIp(request,config); if(ip)headers.set('X-Savora-Client-IP',ip); }
  catch {return problem(503,'AccountsUnavailable');}
  const cookie = sessionCookie(request, config.secure);
  if (cookie) headers.set('Cookie', cookie);
  let body;
  if (!read) {
    if (request.headers.get('content-encoding') && request.headers.get('content-encoding') !== 'identity') return problem(415, 'UnsupportedEncoding');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) return problem(415, 'JsonRequired');
    try {
      body = await boundedText(request.body, 8192);
      const input = JSON.parse(body);
      if (!input || typeof input !== 'object' || Array.isArray(input)) return problem(422, 'InvalidInput');
    } catch (error) { return problem(error.message === 'SizeLimit' ? 413 : 400, error.message === 'SizeLimit' ? 'BodyTooLarge' : 'InvalidJson'); }
    headers.set('Origin', config.origin); headers.set('X-Savora-Request', '1'); headers.set('Content-Type', 'application/json');
    const csrf = request.headers.get('x-savora-csrf');
    if (csrf && tokenPattern.test(csrf)) headers.set('X-Savora-Csrf', csrf);
  }
  try {
    const upstream = await transport(new URL(`v1/auth/${action}`, config.base), {
      method: request.method, headers, body, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(8000),
    });
    const accepted = [200, 202, 204, 400, 401, 403, 413, 415, 422, 429, 503];
    if (!accepted.includes(upstream.status)) return problem(503, 'AccountsUnavailable');
    const cookies = responseCookies(upstream.headers);
    if (cookies.length && (!upstream.ok || !['login', 'logout'].includes(action) || cookies.length !== 1 || !validCookie(cookies[0], config.secure, action))) return problem(503, 'AccountsUnavailable');
    if (upstream.ok && ['login', 'logout'].includes(action) && cookies.length !== 1) return problem(503, 'AccountsUnavailable');
    const expected = ['session', 'login'].includes(action) ? 200 : ['register', 'resend-verification', 'forgot-password'].includes(action) ? 202 : 204;
    if (upstream.ok && upstream.status !== expected) return problem(503, 'AccountsUnavailable');
    let response;
    if (upstream.status === 204) response = new Response(null, { status: 204, headers: privateResponse({}).headers });
    else {
      const input = JSON.parse(await boundedText(upstream.body, 32768));
      if (!upstream.ok) {
        const codes = new Set(['InvalidCredentials', 'InvalidPassword', 'InvalidAction', 'InvalidInput', 'InvalidJson', 'InvalidCsrf', 'InvalidOrigin', 'RateLimited', 'Unauthenticated', 'BodyTooLarge', 'JsonRequired', 'UnsupportedEncoding']);
        response = problem(upstream.status, codes.has(input?.code) ? input.code : 'AccountsUnavailable');
      } else if (upstream.status === 202 && input?.accepted === true) response = privateResponse({ accepted: true }, 202);
      else if (upstream.status === 200 && accountSession(input)) response = privateResponse(accountSession(input));
      else return problem(503, 'AccountsUnavailable');
    }
    for (const value of cookies) response.headers.append('Set-Cookie', value);
    const retry = upstream.headers.get('retry-after');
    if (retry && /^\d{1,5}$/.test(retry)) response.headers.set('Retry-After', retry);
    return response;
  } catch { return problem(503, 'AccountsUnavailable'); } // No passwords, URLs, tokens or provider errors in logs.
}
export function accountSession(input) {
  const account = input?.account;
  if (!account || typeof account.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(account.id) ||
    typeof account.email !== 'string' || account.email.length > 254 ||
    typeof account.displayName !== 'string' || account.displayName.length > 80 ||
    !['User', 'Contributor', 'Editor', 'Moderator', 'Admin'].includes(account.role) ||
    typeof input.csrfToken !== 'string' || !tokenPattern.test(input.csrfToken) ||
    typeof input.expiresAt !== 'string' || !Number.isFinite(Date.parse(input.expiresAt))) return null;
  return { account: { id: account.id, email: account.email, displayName: account.displayName, role: account.role }, csrfToken: input.csrfToken, expiresAt: input.expiresAt };
}
export async function accountProfile(request, env, transport = fetch) {
  const sessionResponse = await accountRequest(request, 'session', env, transport);
  if (!sessionResponse.ok) return sessionResponse;
  const session = await sessionResponse.json();
  try {
    const config = configuration(env), cookie = sessionCookie(request, config.secure);
    if (!cookie) return problem(401, 'Unauthenticated');
    const recipeStatus = Object.create(null), notes = Object.create(null), cursors = new Set();
    let after = null;
    const signal = AbortSignal.timeout(15000);
    for (let page = 0; page < 25; page++) {
      const url = new URL('v1/me/kitchen', config.base);
      url.searchParams.set('limit', '50');
      if (after) url.searchParams.set('after', after);
      const upstream = await transport(url, { headers: { Cookie: cookie, Accept: 'application/json' }, cache: 'no-store', redirect: 'manual', signal });
      if (!upstream.ok) return problem(upstream.status === 401 ? 401 : 503, 'PersonalDataUnavailable');
      const payload = JSON.parse(await boundedText(upstream.body, 262144));
      if (!Array.isArray(payload.items) || payload.items.length > 50) throw new Error('InvalidPayload');
      for (const item of payload.items) {
        if (!validSlug(item.recipeSlug) || (item.status !== null && !['Want to cook', 'Cooking', 'Cooked', 'Favorite'].includes(item.status)) ||
          (item.privateNote !== null && (typeof item.privateNote !== 'string' || item.privateNote.length > 4000))) throw new Error('InvalidPayload');
        if (item.status) recipeStatus[item.recipeSlug] = item.status;
        if (item.privateNote) notes[item.recipeSlug] = item.privateNote;
      }
      if (payload.nextCursor === null) {
        const workspace=await transport(new URL('v1/me/kitchen/workspace',config.base), {headers:{Cookie:cookie,Accept:'application/json'},cache:'no-store',redirect:'manual',signal});
        if (!workspace.ok) return problem(workspace.status===401 ? 401 : 503,'PersonalDataUnavailable');
        const data=JSON.parse(await boundedText(workspace.body,32768)), plan=data?.content?.mealPlan;
        if (!plan || typeof plan!=='object' || Array.isArray(plan) || Object.keys(plan).length>21 || Object.entries(plan).some(([slot,slug]) => !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)-(Breakfast|Lunch|Dinner)$/.test(slot) || !validSlug(slug))) throw new Error('InvalidWorkspace');
        return privateResponse({ user: { displayName: session.account.displayName }, state: { recipeStatus, notes, mealPlan:plan } });
      }
      if (!validSlug(payload.nextCursor) || cursors.has(payload.nextCursor)) throw new Error('InvalidCursor');
      after = payload.nextCursor; cursors.add(after);
    }
  } catch { /* No private upstream contents in logs or responses. */ }
  return problem(503, 'PersonalDataUnavailable');
}
function validSlug(value) { return typeof value === 'string' && value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value); }
export function safeAccountReturn(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(value)) return '/profile';
  try {
    const url = new URL(value, 'https://savora.invalid');
    const decoded = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://savora.invalid' || decoded.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(decoded) || /^\/(?:account|api)(?:\/|$)/.test(decoded)) return '/profile';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return '/profile'; }
}
