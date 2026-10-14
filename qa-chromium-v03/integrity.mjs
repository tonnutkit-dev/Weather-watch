import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { inventory, hash } from '../qa-rc-v03/release-contract.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const rc = '972c0e17243646f60dfb23ec40bdf556481c4bfc';
const main = '2036e2ac788cb31d25fd387cb40520ad95c408a6';
const evidence = '2cae58a44afa73c53786ab2c4d60292ca156dc01';
const branch = 'work/chromium-targeted-lab-v03';
const refs = git('ls-remote', '--heads', 'origin', 'main', 'work/release-candidate-v03-01', 'work/webkit-transport-measurement-audit-v03');
for (const [name, sha] of [['main', main], ['work/release-candidate-v03-01', rc], ['work/webkit-transport-measurement-audit-v03', evidence]]) {
  assert.ok(refs.split('\n').includes(`${sha}\trefs/heads/${name}`), `STOP remote drift: ${name}`);
}
assert.equal(git('status', '--porcelain=v1', '--untracked-files=no'), '');
git('merge-base', '--is-ancestor', rc, 'HEAD');
if (process.env.GITHUB_ACTIONS) {
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, '1');
  assert.equal(process.env.GITHUB_REF_NAME, branch);
}
const changed = git('diff', '--name-status', rc, 'HEAD').split('\n');
for (const row of changed) {
  const [status, path] = row.split('\t');
  const allowed = status === 'M' && path === 'src/components/WeatherOverview.tsx' || status === 'A' &&
    (path === 'src/tests/weather-overview-retry.test.tsx' || path.startsWith('qa-chromium-v03/') || path === '.github/workflows/chromium-targeted-lab-v03.yml');
  assert.ok(allowed, `STOP unexpected diff ${row}`);
}
const exclude = [':(exclude)src/components/WeatherOverview.tsx', ':(exclude)src/tests/weather-overview-retry.test.tsx',
  ':(exclude)qa-chromium-v03', ':(exclude).github/workflows/chromium-targeted-lab-v03.yml'];
git('diff', '--exit-code', rc, 'HEAD', '--', '.', ...exclude);
const candidate = (await inventory(process.argv[2])).filter(x => x.file !== 'release.json');
const baseline = (await inventory(process.argv[3])).filter(x => x.file !== 'release.json');
const output = process.argv[4]; await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), rc, main, evidence,
  changed, otherPreexistingFilesUnchanged: true, productChange: 'cached-error weather retry button only',
  candidate, baseline, candidateManifestSha256: hash(JSON.stringify(candidate)), baselineManifestSha256: hash(JSON.stringify(baseline)),
  releaseMetadataExcluded: true }, null, 2) + '\n');
console.log('Scope/ref guard PASS; both exact runtime inventories retained (UI patch intentionally differs)');
