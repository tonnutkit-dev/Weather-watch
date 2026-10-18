import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function settings(env = process.env) {
  const base = env.WW_RELEASE_BASE || '/Weather-watch/';
  assert.ok(['/', '/Weather-watch/'].includes(base), 'Unsupported release base');
  const channel = env.WW_RELEASE_CHANNEL || 'release-candidate';
  assert.ok(['release-candidate', 'production'].includes(channel), 'Unsupported release channel');
  const directory = env.WW_RELEASE_DIRECTORY || 'dist';
  assert.ok(['dist', 'dist-owner-rc'].includes(directory), 'Unsupported release directory');
  const site = env.WW_RELEASE_URL || (base === '/Weather-watch/' ? 'https://tonnutkit-dev.github.io/Weather-watch/' : null);
  if (site) {
    const url = new URL(site);
    assert.equal(url.protocol, 'https:');
    assert.ok(!url.username && !url.password && !url.search && !url.hash, 'Unsafe release URL');
    assert.equal(url.pathname, base, 'URL path must equal build base');
    if (base === '/Weather-watch/') assert.equal(site, 'https://tonnutkit-dev.github.io/Weather-watch/');
  }
  if (channel === 'production') assert.equal(base, '/Weather-watch/', 'Production target must be Pages');
  return { base, channel, directory, site };
}
export function sourceIdentity(env = process.env) {
  assert.equal(execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=no'], { encoding: 'utf8' }).trim(), '', 'Tracked source must be clean before release metadata');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.match(commit, /^[a-f0-9]{40}$/);
  if (env.GITHUB_SHA) assert.equal(env.GITHUB_SHA, commit, 'CI SHA must match actual checkout');
  return { commit, tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim() };
}
export function safeFile(name) {
  assert.ok(name && !name.startsWith('/') && !name.includes('\\') && !name.split('/').some(p => !p || p === '.' || p === '..'), 'Unsafe manifest path');
}
export function rejectDiagnostics(name, bytes) {
  safeFile(name);
  assert.ok(!/\.map$|(?:^|\/)\.env|fixture|diagnostic|qa-provider|http-probe/i.test(name), 'Non-shipping output: ' + name);
  if (/\.(?:js|mjs|html|json|css)$/.test(name)) {
    const text = bytes.toString('utf8');
    assert.ok(!/__WW_QUERY_CLIENT|__WW_QUERY_EVENTS|__WW_FETCH_EVENTS|__WW_APP_ROOT|__WW_HTTP|provider-fixtures\.json/.test(text), 'Diagnostic hook: ' + name);
    assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/.test(text), 'Credential pattern: ' + name);
  }
}
export async function inventory(directory) {
  const root = resolve(directory), files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name), stat = await lstat(path);
      assert.ok(!stat.isSymbolicLink(), 'Symlink in build');
      if (stat.isDirectory()) await walk(path);
      else {
        assert.ok(stat.isFile(), 'Non-regular build file');
        const file = relative(root, path).split('\\').join('/');
        const bytes = await readFile(path); rejectDiagnostics(file, bytes);
        files.push({ file, bytes: bytes.length, sha256: hash(bytes) });
      }
    }
  }
  await walk(root);
  return files.sort((a, b) => a.file.localeCompare(b.file));
}
export function validateManifest(manifest) {
  assert.equal(manifest.schema, 1);
  assert.match(manifest.source.commit, /^[a-f0-9]{40}$/);
  assert.match(manifest.source.tree, /^[a-f0-9]{40}$/);
  assert.equal(manifest.release.commit, manifest.source.commit);
  assert.equal(manifest.release.version, '0.3.0');
  assert.equal(manifest.release.diagnosticFixturesIncluded, false);
  assert.ok(['/', '/Weather-watch/'].includes(manifest.release.base));
  assert.ok(['release-candidate', 'production'].includes(manifest.release.channel));
  const seen = new Set();
  for (const entry of manifest.files) {
    safeFile(entry.file); assert.ok(!seen.has(entry.file), 'Duplicate file'); seen.add(entry.file);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/); assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0);
  }
  for (const file of ['index.html', 'release.json', 'favicon.svg']) assert.ok(seen.has(file), 'Required file missing');
  assert.ok(manifest.files.some(x => /maplibre-gl-worker.*\.mjs$/.test(x.file)), 'Worker missing');
  assert.ok(manifest.files.some(x => /noto-sans-thai-thai.*\.woff2$/.test(x.file)), 'Thai font missing');
  return manifest;
}
