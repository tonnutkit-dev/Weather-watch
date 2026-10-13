import { appendFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const args = Object.fromEntries(process.argv.slice(2).map((value, index, all) => {
  if (!value.startsWith('--')) return [];
  return [value.slice(2), all[index + 1]];
}).filter((entry) => entry.length));
const output = resolve(args.out || 'qa-transport-v03/evidence/os-transport.jsonl');
const intervalMs = Number(args['interval-ms'] || 5000);
const deadlineMs = Number(args['deadline-ms'] || 20000);
const maxMs = Number(args['max-ms'] || 360000);
if (![intervalMs, deadlineMs, maxMs].every(Number.isFinite)) throw new Error('Invalid numeric probe option');

const common = { latitude: '13.7563', longitude: '100.5018', timezone: 'Asia/Bangkok', timeformat: 'unixtime' };
const targets = [
  {
    id: 'weather',
    url: new URL(`https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
      ...common,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl',
      hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
      forecast_days: '16', wind_speed_unit: 'kmh',
    })}`),
  },
  {
    id: 'air',
    url: new URL(`https://air-quality-api.open-meteo.com/v1/air-quality?${new URLSearchParams({
      ...common,
      current: 'pm2_5,pm10,us_aqi', hourly: 'pm2_5,pm10,us_aqi', forecast_days: '5', domains: 'cams_global',
    })}`),
  },
];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const round = (value) => value === null ? null : Math.round(value * 100) / 100;
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
let stopping = false;
process.once('SIGTERM', () => { stopping = true; });
process.once('SIGINT', () => { stopping = true; });

await mkdir(dirname(output), { recursive: true });
const write = (record) => appendFile(output, `${JSON.stringify(record)}\n`);
await write({
  type: 'start', schema: 1, at: new Date().toISOString(),
  scope: 'CI-only redacted OS transport evidence; fixed public Bangkok province-center preset; no user location, response headers, response body, resolved IP, cookie or credential is retained.',
  intervalMs, deadlineMs,
  targets: targets.map(({ id, url }) => ({ id, host: url.hostname, requestPathSha256: sha256(`${url.pathname}${url.search}`) })),
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
});

async function probe(target, sample) {
  const started = performance.now();
  const base = { type: 'probe', schema: 1, sample, at: new Date().toISOString(), target: target.id, host: target.url.hostname };
  let addresses;
  try {
    addresses = await lookup(target.url.hostname, { all: true, verbatim: true });
  } catch (error) {
    return { ...base, ok: false, stage: 'dns', dnsMs: round(performance.now() - started), error: { name: error?.name || 'Error', code: error?.code || 'UNKNOWN' } };
  }
  const dnsAt = performance.now();
  const selected = addresses.find((entry) => entry.family === 4) || addresses[0];
  if (!selected) return { ...base, ok: false, stage: 'dns', dnsMs: round(dnsAt - started), error: { name: 'Error', code: 'NO_ADDRESS' } };
  return await new Promise((done) => {
    let connectAt = null, secureAt = null, settled = false;
    const finish = (record) => {
      if (settled) return;
      settled = true;
      done({ ...base, dnsMs: round(dnsAt - started), addressCount: addresses.length, addressFamilies: [...new Set(addresses.map((entry) => entry.family))].sort(), ...record });
    };
    const requestStarted = performance.now();
    const request = https.request(target.url, {
      method: 'GET', agent: false,
      headers: { accept: 'application/json', 'user-agent': 'Weather-Watch-CI-Transport-Evidence/0.3' },
    }, (response) => {
      const responseAt = performance.now();
      response.resume();
      response.once('end', () => finish({
        ok: true, status: response.statusCode,
        tcpMs: connectAt === null ? null : round(connectAt - requestStarted),
        tlsMs: connectAt === null || secureAt === null ? null : round(secureAt - connectAt),
        ttfbMs: secureAt === null ? null : round(responseAt - secureAt),
        requestToHeadersMs: round(responseAt - requestStarted), totalMs: round(performance.now() - started),
      }));
    });
    request.once('socket', (socket) => {
      socket.once('connect', () => { connectAt = performance.now(); });
      socket.once('secureConnect', () => { secureAt = performance.now(); });
    });
    request.setTimeout(deadlineMs, () => request.destroy(Object.assign(new Error('Probe deadline exceeded'), { code: 'PROBE_TIMEOUT' })));
    request.once('error', (error) => finish({
      ok: false,
      stage: secureAt !== null ? 'http' : connectAt !== null ? 'tls' : 'tcp',
      tcpMs: connectAt === null ? null : round(connectAt - requestStarted),
      tlsMs: connectAt === null || secureAt === null ? null : round(secureAt - connectAt),
      requestToFailureMs: round(performance.now() - requestStarted), totalMs: round(performance.now() - started),
      error: { name: error?.name || 'Error', code: error?.code || 'UNKNOWN' },
    }));
    request.end();
  });
}

const sessionStarted = performance.now();
let sample = 0;
while (!stopping && performance.now() - sessionStarted < maxMs) {
  sample += 1;
  const records = await Promise.all(targets.map((target) => probe(target, sample)));
  for (const record of records) await write(record);
  if (!stopping) await delay(intervalMs);
}
await write({ type: 'stop', schema: 1, at: new Date().toISOString(), samples: sample, elapsedMs: round(performance.now() - sessionStarted), reason: stopping ? 'signal' : 'max-duration' });
