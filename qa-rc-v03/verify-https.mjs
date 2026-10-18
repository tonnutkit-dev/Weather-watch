import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { normalizeHostedHtml } from '../qa-owner-v03/hosting-html.mjs';
import { hash, validateManifest, rejectDiagnostics, sourceIdentity } from './release-contract.mjs';
export async function verifyHTTPS(manifest, target, { allowLoopback = false, normalizeHosting = false } = {}) {
  validateManifest(manifest);
  const url = new URL(target);
  assert.ok(url.protocol === 'https:' || (allowLoopback && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)), 'HTTPS target required');
  assert.ok(!url.username && !url.password && !url.search && !url.hash);
  assert.equal(url.pathname, manifest.release.base);
  assert.equal(manifest.release.site, target, 'Manifest must be bound to exact approved target');
  const records = [];
  async function get(file, bust) {
    const endpoint = new URL(file, url);
    if (bust) endpoint.searchParams.set('ww_release', manifest.source.commit + '-' + Date.now());
    const response = await fetch(endpoint, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, 'HTTP status for ' + file);
    const bytes = Buffer.from(await response.arrayBuffer());
    const mime = (response.headers.get('content-type') || '').split(';')[0];
    const expected = file.endsWith('.html') ? ['text/html'] : file.endsWith('.json') ? ['application/json'] : /\.(?:js|mjs)$/.test(file) ? ['text/javascript','application/javascript'] : file.endsWith('.css') ? ['text/css'] : file.endsWith('.woff2') ? ['font/woff2','application/font-woff2','application/octet-stream'] : file.endsWith('.svg') ? ['image/svg+xml'] : null;
    if (expected) assert.ok(expected.includes(mime), 'Unexpected MIME for ' + file + ': ' + mime);
    records.push({ file, cacheBusted: bust, bytes: bytes.length, sha256: hash(bytes), mime, cacheControl: response.headers.get('cache-control'), etag: response.headers.get('etag') });
    return bytes;
  }
  const before = JSON.parse((await get('release.json', true)).toString());
  assert.deepEqual(before, manifest.release, 'Live release metadata mismatch');
  for (const entry of manifest.files) {
    let bytes = await get(entry.file, true); rejectDiagnostics(entry.file, bytes);
    if (normalizeHosting && entry.file === 'index.html') {
      const normalized = normalizeHostedHtml(bytes.toString()); bytes = Buffer.from(normalized.html);
      records.at(-1).platformJsdWrappers = normalized.platformJsdWrappers;
    }
    assert.equal(bytes.length, entry.bytes, 'Byte count for ' + entry.file);
    assert.equal(hash(bytes), entry.sha256, 'Hash for ' + entry.file);
  }
  for (const file of ['index.html','release.json']) {
    let bytes = await get(file, false);
    if (normalizeHosting && file === 'index.html') bytes = Buffer.from(normalizeHostedHtml(bytes.toString()).html);
    assert.equal(hash(bytes), manifest.files.find(x => x.file === file).sha256, 'Cached/revalidated ' + file + ' differs');
  }
  const after = JSON.parse((await get('release.json', true)).toString());
  assert.deepEqual(after, before, 'Release changed during asset check');
  return { target, source: manifest.source, release: before, records, scope: 'HTTPS/provenance verification only; not browser or provider acceptance' };
}
export async function runVerification() {
  const path = process.env.WW_RC_MANIFEST || 'qa-rc-v03/artifacts/pages-manifest.json';
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  const source = sourceIdentity();
  assert.deepEqual(manifest.source, source, 'Manifest source must match verifier checkout');
  const target = process.env.WW_RC_VERIFY_URL;
  assert.ok(target, 'Explicit approved WW_RC_VERIFY_URL required');
  const result = await verifyHTTPS(manifest, target, { normalizeHosting: process.env.WW_RC_NORMALIZE_HOSTING === '1' });
  const output = process.env.WW_RC_VERIFY_OUTPUT || 'qa-rc-v03/artifacts/https-verification.json';
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(result, null, 2));
  console.log('Verified exact HTTPS release and every asset', target, manifest.source.commit);
}
