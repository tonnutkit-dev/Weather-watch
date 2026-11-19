import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { settings, sourceIdentity, inventory } from '../qa-rc-v03/release-contract.mjs';
const { base, channel, directory, site } = settings();
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(version, '0.3.0', 'RC release version must be 0.3.0');
const { commit } = sourceIdentity();
const root = resolve(directory), html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = match[1];
  if (/^(https?:|data:|#)/.test(ref)) continue;
  assert.ok(ref.startsWith(base), 'Asset outside release base');
  const asset = resolve(root, ref.slice(base.length));
  assert.ok(!relative(root, asset).startsWith('..'), 'Unsafe asset path');
  await access(asset);
}
const files = await inventory(directory);
assert.ok(files.some(f => /maplibre-gl-worker.*\.mjs$/.test(f.file)), 'Map worker missing');
assert.ok(files.some(f => /noto-sans-thai-thai.*\.woff2$/.test(f.file)), 'Local Thai font missing');
await writeFile(resolve(root, 'release.json'), JSON.stringify({ project: 'Weather Watch', version, commit, base, site, builtAt: new Date().toISOString(), channel, diagnosticFixturesIncluded: false }, null, 2) + '\n');
console.log('Verified release build', { version, commit, base, channel, directory, site, publication: 'not performed by this script' });
