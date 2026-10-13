import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inventory, hash } from '../qa-rc-v03/release-contract.mjs';

const prior = '29b97b125f8f42b89c58919695029ab1dde2b120';
const rc = '972c0e17243646f60dfb23ec40bdf556481c4bfc';
const main = '2036e2ac788cb31d25fd387cb40520ad95c408a6';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
assert.equal(git('status', '--porcelain=v1', '--untracked-files=no'), '');
for (const [branch, expected] of [['main', main], ['work/release-candidate-v03-01', rc], ['work/webkit-transport-evidence-v03', prior]]) {
  const ref = git('ls-remote', '--heads', 'origin', branch).split(/\s/)[0];
  assert.equal(ref, expected, `STOP: remote drift ${branch}`);
}
git('merge-base', '--is-ancestor', prior, head);
const changed = git('diff', '--name-status', prior, head).split('\n').filter(Boolean);
for (const row of changed) {
  const [status, file] = row.split('\t');
  assert.equal(status, 'A', 'Only NEW files allowed');
  assert.ok(file.startsWith('qa-transport-audit-v03/') || file === '.github/workflows/webkit-transport-measurement-audit-v03.yml', `Unapproved path ${file}`);
}
const excluded = [':(exclude)qa-transport-audit-v03', ':(exclude).github/workflows/webkit-transport-measurement-audit-v03.yml'];
git('diff', '--exit-code', prior, head, '--', '.', ...excluded);
const candidate = (await inventory(process.argv[2] || 'dist')).filter(x => x.file !== 'release.json');
const baseline = (await inventory(process.argv[3])).filter(x => x.file !== 'release.json');
assert.deepEqual(candidate, baseline, 'STOP: runtime assets differ');
const output = resolve(process.argv[4] || 'qa-transport-audit-v03/artifacts/runtime-comparison.json');
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify({ schema: 1, head, headTree: git('rev-parse', 'HEAD^{tree}'), prior, rc, main,
  changedPaths: changed, allPreexistingFilesUnchanged: true, runtimeAssetsIdentical: true,
  excluded: 'release.json (build-only commit/timestamp metadata, no publication)', files: candidate,
  runtimeManifestSha256: hash(JSON.stringify(candidate)), node: process.version }, null, 2) + '\n');
console.log(`Scope/runtime PASS: only ${changed.length} new diagnostics/workflow files; ${candidate.length} unchanged runtime files`);
