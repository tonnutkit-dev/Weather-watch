import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const outputRoot = resolve(process.argv[2] || 'qa-transport-v03/evidence');
const roots = [outputRoot, resolve('qa-provider-v03/results')];
const files = [];
async function walk(root, directory = root) {
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(root, path);
      else if (entry.isFile()) files.push({ root, path, name: `${relative(process.cwd(), root)}/${relative(root, path)}`.split('\\').join('/') });
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
for (const root of roots) await walk(root);
const highRisk = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:ghp|github_pat)_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9._~+\/-]{20,}/i;
const cookie = /"(?:cookie|set-cookie)"\s*:\s*"(?!")/i;
const records = [];
for (const file of files) {
  if (file.path.endsWith('evidence-manifest.json')) continue;
  const bytes = await readFile(file.path);
  if (/\.(?:json|jsonl|har|txt|log|md)$/i.test(file.path)) {
    const text = bytes.toString('utf8');
    assert.ok(!highRisk.test(text), `Possible credential in ${file.name}`);
    assert.ok(!cookie.test(text), `Possible cookie in ${file.name}`);
  }
  records.push({ file: file.name, bytes: (await stat(file.path)).size, sha256: createHash('sha256').update(bytes).digest('hex') });
}
records.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(resolve(outputRoot, 'evidence-manifest.json'), `${JSON.stringify({
  schema: 1, generatedAt: new Date().toISOString(), sourceCommit: process.env.GITHUB_SHA || null,
  matrixJob: process.env.WW_TRANSPORT_JOB || null, redactionCheck: 'PASS', files: records,
}, null, 2)}\n`);
console.log(`Evidence manifest/redaction PASS: ${records.length} files`);
