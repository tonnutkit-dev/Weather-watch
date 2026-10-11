import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { normalizeHostedHtml } from './hosting-html.mjs';
const url = 'https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/';
const approved = '4b3548fa49abd9475547fc6e8336a1b854ad6952';
const result = { url, approved, anonymous: true, assets: [], checkedAt: new Date().toISOString() };
async function get(path) {
  const response = await fetch(new URL(path, url), { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response;
}
try {
  const html = await (await get('')).text(); assert.match(html, /Isolated Owner QA/); assert.match(html, /id="root"/);
  const release = await (await get('release.json')).json(); result.release = release;
  assert.equal(release.commit, approved); assert.equal(release.base, '/'); assert.equal(release.diagnosticFixturesIncluded, false);
  const manifest = await (await get('asset-integrity.json')).json(); assert.equal(manifest.candidate, approved);
  const items = [...manifest.assets];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (items.length) {
      const item = items.shift(); const response = await get(item.path);
      const bytes = Buffer.from(await response.arrayBuffer());
      const actualHash = createHash('sha256').update(bytes).digest('hex');
      // The manifest records the root build HTML. Cloudflare may append its JSD
      // wrapper at the edge; compare the exact remainder and preserve raw evidence.
      if (item.path === 'index.html' && actualHash !== item.sha256) {
        await mkdir('qa-owner-v03/raw', { recursive: true });
        await writeFile('qa-owner-v03/raw/hosting-index.html.txt', bytes);
        const hosting = normalizeHostedHtml(bytes.toString('utf8'));
        const normalizedSha256 = createHash('sha256').update(hosting.html).digest('hex');
        assert.equal(normalizedSha256, item.sha256, 'HTML differs beyond the exact hosting JSD wrapper');
        result.assets.push({ path: item.path, http: response.status, mime: response.headers.get('content-type'), rawSha256: actualHash, normalizedSha256, platformJsdWrappers: hosting.platformJsdWrappers });
        continue;
      }
      if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) {
        await mkdir('qa-owner-v03/raw', { recursive: true });
        await writeFile(`qa-owner-v03/raw/mismatch-${item.path.replaceAll('/', '_')}.txt`, bytes);
      }
      assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.path);
      result.assets.push({ path: item.path, http: response.status, mime: response.headers.get('content-type'), sha256Matched: true });
    }
  }));
  const old = await fetch('https://tonnutkit-dev.github.io/Weather-watch/release.json', { signal: AbortSignal.timeout(20000) });
  assert.equal(old.status, 200); result.originalGitHubPages = await old.json();
  assert.equal(result.originalGitHubPages.commit, '2036e2ac788cb31d25fd387cb40520ad95c408a6');
  result.status = 'passed'; console.log(`Anonymous HTTPS + ${result.assets.length} asset SHA256 checks + original Pages protection PASS`);
} catch (error) { result.status = 'failed'; result.error = String(error); throw error; }
finally { await mkdir('qa-owner-v03/raw', { recursive: true }); await writeFile('qa-owner-v03/raw/http-evidence.json', JSON.stringify(result, null, 2) + '\n'); }
