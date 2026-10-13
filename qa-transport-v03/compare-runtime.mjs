import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const baseline = process.argv[2];
const candidateDirectory = resolve(process.argv[3] || 'dist');
const baselineDirectory = resolve(process.argv[4] || '/tmp/ww-transport-baseline/dist');
const output = resolve(process.argv[5] || 'qa-transport-v03/evidence/runtime-comparison.json');
assert.match(baseline || '', /^[a-f0-9]{40}$/);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const candidate = git('rev-parse', 'HEAD');
const allowed = new Set(['.github/workflows/webkit-transport-evidence-v03.yml']);
const changed = git('diff', '--name-only', baseline, candidate).split('\n').filter(Boolean);
for (const file of changed) assert.ok(allowed.has(file) || file.startsWith('qa-transport-v03/'), `Out-of-scope path: ${file}`);
git('diff', '--exit-code', baseline, candidate, '--', 'src', 'public', 'DESIGN.md', 'package.json', 'package-lock.json', 'vite.config.ts', 'tests', 'playwright.config.ts', 'qa-provider-v03', '.github/workflows/pages.yml');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function inventory(root) {
  const records = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        const file = relative(root, path).split('\\').join('/');
        if (file === 'release.json') continue;
        const bytes = await readFile(path);
        records.push({ file, bytes: bytes.length, sha256: sha256(bytes) });
      }
    }
  }
  await walk(root);
  return records.sort((a, b) => a.file.localeCompare(b.file));
}
const candidateFiles = await inventory(candidateDirectory);
const baselineFiles = await inventory(baselineDirectory);
assert.deepEqual(candidateFiles, baselineFiles, 'Runtime artifacts differ from exact RC baseline');
const protectedTree = (ref) => git('ls-tree', '-r', ref, '--', 'src', 'public', 'DESIGN.md', 'package.json', 'package-lock.json', 'vite.config.ts', 'tests', 'playwright.config.ts', 'qa-provider-v03', '.github/workflows/pages.yml');
assert.equal(protectedTree(candidate), protectedTree(baseline), 'Protected source hashes differ from RC baseline');
const report = {
  schema: 1,
  baseline: { commit: baseline, tree: git('rev-parse', `${baseline}^{tree}`) },
  candidate: { commit: candidate, tree: git('rev-parse', `${candidate}^{tree}`) },
  changedPaths: changed,
  protectedSourceIdentical: true,
  runtimeArtifactsIdentical: true,
  excludedFromByteComparison: [{ file: 'release.json', reason: 'build timestamp and evidence-branch commit identity are intentionally unique; file is not deployed' }],
  files: candidateFiles,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Runtime/source invariant PASS: ${candidateFiles.length} runtime files match ${baseline}`);
