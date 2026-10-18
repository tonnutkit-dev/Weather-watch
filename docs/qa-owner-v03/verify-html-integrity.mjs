// Reproduce diagnostic assertions using captured public HTML; no site/app mutation.
import { normalizeHostedHtml } from '../../qa-owner-v03/hosting-html.mjs';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const actual = readFileSync(new URL('./edge-index-observation.html.txt', import.meta.url), 'utf8');
const expected = readFileSync(new URL('./build-index.html.txt', import.meta.url), 'utf8');
assert.equal(normalizeHostedHtml(actual).html, expected);
assert.equal(normalizeHostedHtml(expected).html, expected);
assert.equal(normalizeHostedHtml(actual).platformJsdWrappers, 1);
assert.notEqual(normalizeHostedHtml(actual.replace('index-BqqJ5UR8.js', 'wrong.js')).html, expected);
assert.notEqual(normalizeHostedHtml(actual.replace('/cdn-cgi/challenge-platform/scripts/jsd/main.js', '/untrusted.js')).html, expected);
assert.notEqual(normalizeHostedHtml(actual.replace('</body>', '<script>unexpected()</script></body>')).html, expected);
console.log('6 integrity assertions passed; modified app/wrapper/extra script remain rejected');
