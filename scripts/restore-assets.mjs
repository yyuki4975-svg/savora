import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'public-assets.json'), 'utf8'));
for (const item of manifest.files) {
  if (!/^(images|maps)\/[-a-zA-Z0-9_./]+$/.test(item.path) || item.path.includes('..')) throw new Error('Invalid asset path');
  const file = path.join(root, 'public', item.path);
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  try { if (hash(await fs.readFile(file)) === item.sha256) continue; } catch {}
  const response = await fetch(new URL('/' + item.path, manifest.origin), { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error('Asset request failed ' + response.status + ' ' + item.path);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== item.bytes || hash(bytes) !== item.sha256) throw new Error('Asset checksum mismatch ' + item.path);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file + '.download', bytes);
  await fs.rename(file + '.download', file);
}
console.log('Public assets restored.');
