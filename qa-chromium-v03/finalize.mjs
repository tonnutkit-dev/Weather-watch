import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const root = 'qa-chromium-v03', destination = join(root, 'delivery');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = [];
const redact = text => text.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, 'IP_REDACTED')
  .replace(/(?<=[?&])(latitude|longitude)=[^&\s"<>]+/g, '$1=PUBLIC_PRESET_REDACTED');
async function copy(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const source = join(directory, item.name);
    if (item.isDirectory()) { await copy(source); continue; }
    assert.ok(/\.(json|log)$/.test(item.name), 'STOP unexpected artifact type');
    const original = await readFile(source), text = original.toString('utf8');
    assert.ok(!/-----BEGIN .*PRIVATE KEY|(?:ghp|github_pat)_[\w]{20,}|Bearer\s+[\w.~+/-]{20,}/i.test(text), 'STOP credential pattern');
    // This suite records no headers/cookies, browser trace, screenshot or HAR.
    const bytes = Buffer.from(redact(text)), name = relative(root, source);
    const target = join(destination, name); await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    manifest.push({ file: name, originalSha256: hash(original), sha256: hash(bytes), bytes: bytes.length, redacted: !bytes.equals(original) });
  }
}
await copy(join(root, 'artifacts'));
await copy(join(root, 'results'));
await readFile(join(destination, 'results/browser/.last-run.json')); // Include actual hidden result.
await writeFile(join(destination, 'manifest.json'), JSON.stringify({ files: manifest,
  privacy: 'structured synthetic LAB events only; no HAR/trace, body or header recording; IP/query strings redacted',
  statement: 'Not a complete DLP/security audit; no user session or private location used' }, null, 2) + '\n');
console.log(`Redacted LAB delivery: ${manifest.length} hashed members; actual hidden result retained`);
