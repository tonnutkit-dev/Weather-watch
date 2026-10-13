import https from 'node:https';
import { performance } from 'node:perf_hooks';

// No wrapping of native lookup in LIVE. Timing comes from the request socket.
// fixtureOptions is used only by local HTTPS diagnostic validation.
export function probe(url, { target, cycle, deadlineMs = 20000, fixtureOptions = {}, signal } = {}) {
  if (!(url instanceof URL)) throw new Error('URL object required');
  if (url.protocol !== 'https:') throw new Error('HTTPS required');
  if (Object.keys(fixtureOptions).length && url.hostname !== 'localhost') throw new Error('Fixture options outside loopback');
  if (!['weather', 'air', 'fixture'].includes(target)) throw new Error('Invalid redacted target');
  if (!Number.isInteger(deadlineMs) || deadlineMs <= 0 || deadlineMs > 20000) throw new Error('Invalid absolute deadline');
  const started = performance.now(), wallOrigin = Date.now();
  const events = [];
  const elapsed = () => Math.round((performance.now() - started) * 100) / 100;
  const event = (name, detail = {}) => events.push({ name, elapsedMs: elapsed(), wallTime: new Date().toISOString(), ...detail });
  let lastTransportEvent = 'request', deadlineFired = false, timerDriftMs = null;
  let request, response, socket, timer, resolveProbe, completed = false;
  const safeCode = error => /^[A-Z0-9_]{1,60}$/.test(error?.code || '') ? error.code : 'UNCLASSIFIED_ERROR';
  const transport = (name, detail = {}) => { lastTransportEvent = name; event(name, detail); };
  const promise = new Promise(resolve => { resolveProbe = resolve; });
  const finish = (outcome, code = null) => {
    if (completed) return;
    completed = true;
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    resolveProbe({ schema: 2, target, cycle, startedAt: new Date(wallOrigin).toISOString(), deadlineMs,
      elapsedMs: elapsed(), timerDriftMs, deadlineFired, outcome, code,
      lastTransportEvent, status: response?.statusCode ?? null, events,
      interpretation: 'Last observed request-socket event; does not establish root cause or browser phase.' });
  };
  const stop = (code, cause) => {
    if (completed) return;
    event('abort', { cause });
    const error = Object.assign(new Error('Redacted diagnostic terminal outcome'), { code });
    response?.destroy(error);
    request?.destroy(error);
    socket?.destroy(error);
    // settle independently, even when native error/abort callbacks do not arrive.
    queueMicrotask(() => finish(cause === 'absolute-deadline' ? 'deadline' : 'collection-abort', code));
  };
  const onAbort = () => stop('COLLECTION_ABORT', 'collection-stop');
  timer = setTimeout(() => {
    deadlineFired = true;
    timerDriftMs = Math.round((performance.now() - started - deadlineMs) * 100) / 100;
    event('deadline', { timerDriftMs });
    stop('ABSOLUTE_DEADLINE', 'absolute-deadline');
  }, deadlineMs);
  event('request');
  if (signal?.aborted) { onAbort(); return promise; }
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    request = https.request(url, { agent: false, method: 'GET', headers: { accept: 'application/json' }, ...fixtureOptions }, res => {
      response = res;
      transport('headers', { status: res.statusCode });
      res.on('error', error => { event('response-error', { code: safeCode(error) });
        if (deadlineFired) finish('deadline', 'ABSOLUTE_DEADLINE');
        else if (signal?.aborted) finish('collection-abort', 'COLLECTION_ABORT');
        else finish('response-error', safeCode(error)); });
      res.on('aborted', () => { event('response-aborted'); if (!deadlineFired && !signal?.aborted) finish('response-aborted', 'RESPONSE_ABORTED'); });
      res.on('end', () => { transport('end'); finish('response-complete'); });
      res.on('close', () => { if (!completed && !res.complete && !deadlineFired && !signal?.aborted) finish('response-close', 'RESPONSE_INCOMPLETE'); });
      res.resume(); // Do not retain body, headers, addresses or credentials.
    });
    request.on('socket', s => {
      socket = s;
      event('socket');
      s.on('lookup', (error, _address, family) => transport('lookup', { result: error ? 'ERROR' : 'RESOLVED', family: family === 4 || family === 6 ? family : null, ...(error ? { code: safeCode(error) } : {}) }));
      s.on('connect', () => transport('connect'));
      s.on('secureConnect', () => transport('secureConnect'));
      s.on('error', error => { if (!completed) event('socket-error', { code: safeCode(error) }); });
    });
    request.on('error', error => {
      event('error', { code: safeCode(error) });
      if (deadlineFired) finish('deadline', 'ABSOLUTE_DEADLINE');
      else if (signal?.aborted) finish('collection-abort', 'COLLECTION_ABORT');
      else finish('request-error', safeCode(error));
    });
    request.end();
  } catch (error) {
    event('error', { code: safeCode(error) });
    finish('request-error', safeCode(error));
  }
  return promise;
}
