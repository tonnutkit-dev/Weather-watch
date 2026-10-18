// Deployment-only packaging: approved application source and provider logic remain byte-identical.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const approved = JSON.parse(readFileSync('.openai/approved-source.json', 'utf8'));
for (const item of approved.files) {
  const hash = createHash('sha256').update(readFileSync(item.path)).digest('hex');
  if (hash !== item.sha256) throw new Error(`Approved source changed: ${item.path}`);
}
// CLI override only. Keep the approved /Weather-watch/ Vite config unchanged.
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--base', '/'], { stdio: 'inherit' });
const filename = 'dist/index.html';
let html = readFileSync(filename, 'utf8');
html = html.replace(/<title>[^<]*<\/title>/, '<title>Weather Watch V0.3 P0 · Isolated Owner QA</title>');
writeFileSync(filename, html);
const release = {
  project: 'Weather Watch', version: '0.3-p0-owner-qa', channel: 'isolated-owner-qa',
  commit: approved.candidate, testedSource: approved.testedSource, base: '/',
  projectId: JSON.parse(readFileSync('.openai/hosting.json', 'utf8')).project_id,
  site: 'https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site',
  builtAt: new Date().toISOString(),
  applicationSourceUnchanged: true, diagnosticFixturesIncluded: false,
};
writeFileSync('dist/release.json', JSON.stringify(release, null, 2) + '\n');
function files(dir) { return readdirSync(dir).flatMap(name => { const p = `${dir}/${name}`; return statSync(p).isDirectory() ? files(p) : [p]; }); }
const assets = files('dist').filter(p => p !== 'dist/asset-integrity.json').map(p => ({
  path: p.slice(5), bytes: statSync(p).size, sha256: createHash('sha256').update(readFileSync(p)).digest('hex'),
}));
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^(https?:|data:|#)/.test(m[1])) continue;
  if (!m[1].startsWith('/') || !assets.some(a => a.path === m[1].slice(1))) throw new Error(`Invalid root asset: ${m[1]}`);
}
if (!assets.some(a => /maplibre-gl-worker.*\.mjs$/.test(a.path))) throw new Error('Map worker missing');
if (!assets.some(a => /noto-sans-thai-thai.*\.woff2$/.test(a.path))) throw new Error('Thai font missing');
if (assets.some(a => /diagnostics|fixtures|test-results|prototype/i.test(a.path))) throw new Error('Non-production files in deployment');
writeFileSync('dist/asset-integrity.json', JSON.stringify({ candidate: approved.candidate, assets }, null, 2) + '\n');
console.log(`Isolated QA root build verified, approved candidate ${approved.candidate}, ${assets.length} assets.`);
