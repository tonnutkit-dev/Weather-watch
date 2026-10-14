import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const root = process.cwd(), source = '/tmp/ww-strict-live-candidate';
const output = resolve(root, 'qa-strict-live-v03/private');
const qaBase = '1f8cecbbfdbbd7c01b8def91620232e54c6fb48c';
const candidate = 'a19d53ac5587ded31b7e3cad6112f02c7621aeb6';
const rc = '972c0e17243646f60dfb23ec40bdf556481c4bfc';
const main = '2036e2ac788cb31d25fd387cb40520ad95c408a6';
const branch = 'work/strict-live-candidate-gate-v03';
const expectedRuntime = '204577877fa644fbbf0cd145ce12aecaa5c9e4b543d5bf20c2066a8ffc06c147';
const files = ['.github/workflows/strict-live-candidate-v03.yml', 'qa-strict-live-v03/runner.mjs', 'qa-strict-live-v03/finalize.py'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const save = async (name, data) => { await mkdir(output, { recursive: true }); await writeFile(resolve(output, name), JSON.stringify(data, null, 2) + '\n'); };
function envGuard() {
  assert.equal(process.version, 'v24.21.0');
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('VITE_') || key.startsWith('PLAYWRIGHT_') || key.startsWith('WW_DIAG_') || ['PWDEBUG', 'WW_RC_ROOT', 'WW_RELEASE_URL', 'WW_RELEASE_BASE', 'WW_RELEASE_DIRECTORY', 'NODE_OPTIONS'].includes(key))
      assert.ok(!process.env[key], `STOP environment override: ${key}`);
  }
}
async function guard() {
  envGuard();
  assert.equal(process.env.GITHUB_ACTIONS, 'true');
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, '1');
  assert.equal(process.env.GITHUB_REF_NAME, branch);
  assert.equal(process.env.GITHUB_EVENT_NAME, 'push');
  const head = git(root, 'rev-parse', 'HEAD');
  assert.equal(head, process.env.GITHUB_SHA);
  assert.equal(git(root, 'rev-parse', 'HEAD^'), qaBase);
  assert.equal(git(root, 'rev-list', '--count', `${qaBase}..HEAD`), '1');
  assert.equal(git(root, 'rev-list', '--count', `${candidate}..HEAD`), '2');
  assert.equal(git(root, 'status', '--porcelain=v1', '--untracked-files=no'), '');
  assert.deepEqual(git(root, 'diff', '--name-status', candidate, 'HEAD').split('\n').sort(), files.map(p => `A\t${p}`).sort());
  assert.deepEqual(git(root, 'diff', '--name-status', qaBase, 'HEAD').split('\n').sort(), files.map(p => `M\t${p}`).sort());
  git(root, 'merge-base', '--is-ancestor', rc, candidate);
  const refs = git(root, 'ls-remote', '--heads', 'origin', 'main', 'work/release-candidate-v03-01', 'work/chromium-targeted-lab-v03', branch).split('\n');
  for (const [name, sha] of [['main', main], ['work/release-candidate-v03-01', rc], ['work/chromium-targeted-lab-v03', candidate], [branch, head]])
    assert.ok(refs.includes(`${sha}\trefs/heads/${name}`), `STOP SHA drift: ${name}`);
  return { head, tree: git(root, 'rev-parse', 'HEAD^{tree}'), qaBase, candidate, rc, main, branch };
}
async function buildIdentity(label) {
  assert.equal(git(source, 'rev-parse', 'HEAD'), candidate);
  assert.equal(git(source, 'status', '--porcelain=v1', '--untracked-files=no'), '');
  const { inventory } = await import(pathToFileURL(resolve(source, 'qa-rc-v03/release-contract.mjs')));
  const all = await inventory(resolve(source, 'dist'));
  const runtime = all.filter(x => x.file !== 'release.json');
  const digest = hash(JSON.stringify(runtime));
  assert.equal(digest, expectedRuntime, 'STOP runtime differs from candidate LAB inventory');
  const release = JSON.parse(await readFile(resolve(source, 'dist/release.json'), 'utf8'));
  assert.equal(release.commit, candidate);
  assert.equal(release.base, '/Weather-watch/');
  assert.equal(release.channel, 'release-candidate');
  assert.equal(release.diagnosticFixturesIncluded, false);
  await save(`build-${label}.json`, { source: candidate, tree: git(source, 'rev-parse', 'HEAD^{tree}'), runtimeSha256: digest, release, files: all });
}
async function verifyReleaseIdentity() {
  const eventSha = process.env.GITHUB_SHA;
  assert.equal(eventSha, git(root, 'rev-parse', 'HEAD'));
  assert.equal(git(source, 'rev-parse', 'HEAD'), candidate);
  assert.equal(git(source, 'status', '--porcelain=v1', '--untracked-files=no'), '');
  const proof = { status: 'checking', eventSha, candidate, runs: [] };
  const childEnv = { ...process.env, GITHUB_SHA: candidate, WW_RELEASE_CHANNEL: 'release-candidate' };
  const probe = "import {sourceIdentity} from './qa-rc-v03/release-contract.mjs'; console.log(JSON.stringify(sourceIdentity()));";
  async function invoke(label, command, args, env) {
    const result = spawnSync(command, args, { cwd: source, env, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    await writeFile(resolve(output, `${label}.stdout.log`), result.stdout || '');
    await writeFile(resolve(output, `${label}.stderr.log`), result.stderr || '');
    proof.runs.push({ label, status: result.status, signal: result.signal, errorCode: result.error?.code || null });
    assert.ok(!result.error && !result.signal, 'STOP identity proof process failed');
    return result;
  }
  try {
    const negative = await invoke('identity-negative', process.execPath, ['--input-type=module', '-e', probe], { ...process.env });
    assert.equal(negative.status, 1);
    assert.ok(negative.stderr.includes('CI SHA must match actual checkout'), 'STOP original identity assertion did not reject mismatch');
    const positive = await invoke('identity-positive', process.execPath, ['--input-type=module', '-e', probe], childEnv);
    assert.equal(positive.status, 0);
    assert.deepEqual(JSON.parse(positive.stdout), { commit: candidate, tree: git(source, 'rev-parse', 'HEAD^{tree}') });
    const verified = await invoke('release-verifier', 'npm', ['run', 'verify:pages'], childEnv);
    assert.equal(verified.status, 0, 'STOP unchanged release verifier failed');
    assert.equal(process.env.GITHUB_SHA, eventSha, 'STOP parent event identity mutated');
    proof.status = 'passed';
  } catch (error) {
    proof.status = 'failed';
    throw error;
  } finally {
    proof.parentEventShaAfter = process.env.GITHUB_SHA;
    await save('identity-proof.json', proof);
  }
}
async function freePort(port) {
  await new Promise((ok, fail) => { const server = createServer(); server.once('error', fail); server.listen(port, '127.0.0.1', () => server.close(ok)); });
}
const mode = process.argv[2];
if (mode === 'prepare') {
  const identity = await guard();
  git(root, 'worktree', 'add', '--detach', source, candidate);
  const sources = [];
  for (const path of [...files, 'qa-provider-v03/provider.spec.ts', 'qa-provider-v03/playwright.config.ts', 'package-lock.json'])
    sources.push({ path, sha256: hash(await readFile(resolve(root, path))) });
  await save('identity.json', { ...identity, candidateTree: git(source, 'rev-parse', 'HEAD^{tree}'), sources,
    run: process.env.GITHUB_RUN_ID, attempt: 1, node: process.version, os: os.type(), release: os.release(), arch: os.arch(),
    runnerImage: process.env.ImageOS || null, runnerImageVersion: process.env.ImageVersion || null,
    proxyPresence: Object.fromEntries(['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY'].map(k => [k, Boolean(process.env[k])])) });
} else if (mode === 'verify') {
  await guard(); await verifyReleaseIdentity(); await buildIdentity('before');
} else if (mode === 'collect') {
  await guard(); await buildIdentity('collection-start');
  await save('browser-revisions.json', JSON.parse(await readFile(resolve(source, 'node_modules/playwright-core/browsers.json'), 'utf8')));
  const exits = [];
  for (const engine of ['chromium', 'webkit']) {
    await guard(); await buildIdentity(`before-${engine}`);
    await freePort(4173); await freePort(4174);
    const directory = resolve(output, engine); await mkdir(directory, { recursive: true });
    const env = { ...process.env, GITHUB_SHA: candidate, WW_DIAG_CONTROL: '1', WW_DIAG_SIGNALS: '', WW_DIAG_PUBLIC_URL: '',
      PLAYWRIGHT_JSON_OUTPUT_FILE: resolve(directory, 'summary.json') };
    const args = ['--no-install', 'playwright', 'test', '--config', 'qa-provider-v03/playwright.config.ts', '--project', engine,
      '--grep', '^LIVE zero-retry original 45s temperature sample [1-3]$', '--workers', '1', '--retries', '0',
      '--repeat-each', '1', '--max-failures', '0', '--output', resolve(directory, 'browser'), '--reporter', 'list,json'];
    await save(`${engine}-command.json`, { engine, args, source: candidate, startedAt: new Date().toISOString(),
      environment: { WW_DIAG_CONTROL: '1', WW_DIAG_SIGNALS: '', WW_DIAG_PUBLIC_URL: '' },
      scope: 'Fresh engine launch, three fresh contexts; shared Ubuntu/network; no extra probes, routes, or test retries.' });
    const stdout = [], stderr = [];
    const child = spawn('npx', args, { cwd: source, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', b => stdout.push(b));
    child.stderr.on('data', b => stderr.push(b));
    const terminal = await new Promise(resolveExit => {
      child.once('error', () => resolveExit({ code: null, error: 'SPAWN_ERROR' }));
      child.once('close', (code, signal) => resolveExit({ code, signal }));
    });
    await writeFile(resolve(directory, 'stdout.log'), Buffer.concat(stdout));
    await writeFile(resolve(directory, 'stderr.log'), Buffer.concat(stderr));
    exits.push({ engine, ...terminal, finishedAt: new Date().toISOString() });
    await save('exits.json', exits);
    console.log('Strict first-sample collection finished:', engine, terminal.code);
    assert.ok(terminal.code === 0 || terminal.code === 1, 'STOP engine execution infrastructure failure');
    const summary = JSON.parse(await readFile(resolve(directory, 'summary.json'), 'utf8'));
    const tests = summary.suites.flatMap(s => s.specs || []).flatMap(s => s.tests || []);
    assert.equal(tests.length, 3, 'STOP collection/sample count mismatch');
    assert.ok(tests.every(t => t.projectName === engine && t.results.length === 1 && t.results[0].retry === 0));
    assert.equal(summary.stats.skipped, 0); assert.equal(summary.stats.flaky, 0);
    await buildIdentity(`after-${engine}`);
    // A strict failure stays FAIL; finish only the six already-authorized first samples.
  }
  await guard();
  process.exitCode = exits.some(x => x.code !== 0) ? 1 : 0;
} else throw new Error('Unknown mode');
