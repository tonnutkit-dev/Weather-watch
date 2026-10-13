import assert from 'node:assert/strict';
import https from 'node:https';
import net from 'node:net';
import { lookup } from 'node:dns';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { probe } from './probe.mjs';

const output = resolve(process.argv[2] || 'qa-transport-audit-v03/artifacts/fixture-validation.json');
const temporary = await mkdtemp(join(tmpdir(), 'ww-https-fixture-'));
const cases = [], sockets = new Set(), servers = [];
const capture = server => { server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); }); servers.push(server); return server; };
const listen = server => new Promise((done, fail) => { server.once('error', fail); server.listen(0, '::', () => done(server.address().port)); });
try {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(temporary, 'key.pem'), '-out', join(temporary, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
  const key = await readFile(join(temporary, 'key.pem')), cert = await readFile(join(temporary, 'cert.pem'));
  const fixture = capture(https.createServer({ key, cert }, (request, response) => {
    if (request.url === '/body-stall') { response.writeHead(200, { 'content-type': 'application/json' }); response.write('{'); return; }
    if (request.url === '/body-abort') { response.writeHead(200); response.write('{'); setTimeout(() => response.socket?.destroy(), 60); return; }
    response.writeHead(200, { 'content-type': 'application/json' }); response.end('{}');
  }));
  fixture.on('tlsClientError', () => {});
  const port = await listen(fixture);
  const stalledTLS = capture(net.createServer(socket => { socket.on('error', () => {}); }));
  const stalledPort = await listen(stalledTLS);
  const options = { target: 'fixture', deadlineMs: 600, fixtureOptions: { ca: cert } };
  const run = async (name, url, extra = {}, check) => {
    const wall = performance.now();
    const result = await probe(new URL(url), { ...options, ...extra });
    const independentElapsedMs = Math.round((performance.now() - wall) * 100) / 100;
    check(result, independentElapsedMs);
    cases.push({ name, independentElapsedMs, result });
  };
  const assertDeadline = (result, independentMs) => {
    assert.equal(result.outcome, 'deadline');
    assert.equal(result.deadlineFired, true);
    assert.ok(independentMs >= result.deadlineMs - 20 && independentMs < result.deadlineMs + 2500);
    assert.ok(Math.abs(independentMs - result.elapsedMs) < 100);
    assert.ok(result.timerDriftMs >= -20 && result.timerDriftMs < 2500);
    assert.ok(result.events.some(e => e.name === 'abort'));
  };
  await run('native-success-lookup-connect-TLS-headers-end', `https://localhost:${port}/ok`, {}, result => {
    assert.equal(result.status, 200); assert.equal(result.outcome, 'response-complete');
    for (const name of ['lookup', 'connect', 'secureConnect', 'headers', 'end']) assert.ok(result.events.some(e => e.name === name), `Missing native ${name}`);
  });
  for (const all of [false, true]) {
    await run(`fixture-lookup-callback-shape-all-${all}`, `https://localhost:${port}/ok`, {
      fixtureOptions: { ca: cert, autoSelectFamily: all, lookup: (hostname, options, callback) => lookup(hostname, options, callback) },
    }, result => { assert.equal(result.status, 200); assert.equal(result.outcome, 'response-complete'); });
  }
  await run('stalled-DNS-absolute-terminal', `https://localhost:${port}/ok`, {
    fixtureOptions: { ca: cert, lookup: () => {} },
  }, (result, elapsed) => { assertDeadline(result, elapsed); assert.ok(!result.events.some(e => e.name === 'connect')); });
  await run('stalled-TLS-absolute-terminal', `https://localhost:${stalledPort}/`, {}, (result, elapsed) => {
    assertDeadline(result, elapsed); assert.equal(result.lastTransportEvent, 'connect');
  });
  await run('stalled-body-absolute-terminal', `https://localhost:${port}/body-stall`, {}, (result, elapsed) => {
    assertDeadline(result, elapsed); assert.equal(result.status, 200); assert.equal(result.lastTransportEvent, 'headers');
  });
  await run('body-abort-handled-terminal', `https://localhost:${port}/body-abort`, {}, result => {
    assert.equal(result.status, 200); assert.ok(['response-aborted', 'response-error', 'response-close'].includes(result.outcome));
    assert.equal(result.deadlineFired, false);
  });
  await run('full-20000ms-TLS-absolute-terminal', `https://localhost:${stalledPort}/`, { deadlineMs: 20000 }, (result, elapsed) => {
    assertDeadline(result, elapsed); assert.equal(result.lastTransportEvent, 'connect');
  });
  const abort = new AbortController();
  setTimeout(() => abort.abort(), 100);
  await run('collection-abort-terminal', `https://localhost:${stalledPort}/`, { signal: abort.signal }, result => {
    assert.equal(result.outcome, 'collection-abort'); assert.equal(result.deadlineFired, false);
  });
  assert.throws(() => probe(new URL('https://example.com/'), { ...options }), /Fixture options outside loopback/);
  cases.push({ name: 'fixture-hook-rejected-outside-loopback', pass: true });
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify({ schema: 1, scope: 'CI-only local fixture, generated certificate/key excluded; no live provider traffic', pass: true, caseCount: cases.length, node: process.version, cases }, null, 2) + '\n');
  console.log(`Local HTTPS fixture PASS ${cases.length}/${cases.length}; includes independently measured absolute 20000ms deadline`);
} finally {
  for (const socket of sockets) socket.destroy();
  await Promise.all(servers.map(server => new Promise(done => server.close(done))));
  await rm(temporary, { recursive: true }); // Only this generated, validated fixture temp dir.
}
