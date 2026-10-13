import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { probe } from './probe.mjs';

const output = resolve(process.argv[2] || 'qa-transport-audit-v03/artifacts');
await mkdir(output, { recursive: true });
const common = { latitude: '13.7563', longitude: '100.5018', timezone: 'Asia/Bangkok', timeformat: 'unixtime' };
const targets = [
  { target: 'weather', url: new URL(`https://api.open-meteo.com/v1/forecast?${new URLSearchParams({ ...common,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl',
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max', forecast_days: '16', wind_speed_unit: 'kmh' })}`) },
  { target: 'air', url: new URL(`https://air-quality-api.open-meteo.com/v1/air-quality?${new URLSearchParams({ ...common,
    current: 'pm2_5,pm10,us_aqi', hourly: 'pm2_5,pm10,us_aqi', forecast_days: '5', domains: 'cams_global' })}`) },
];
const proxyFlags = Object.fromEntries(['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy', 'NODE_USE_ENV_PROXY', 'NODE_OPTIONS'].map(name => [name, process.env[name] ? 'PRESENT' : 'ABSENT']));
const write = record => appendFile(resolve(output, 'native-transport.jsonl'), JSON.stringify(record) + '\n');
await write({ type: 'start', schema: 2, wallTime: new Date().toISOString(), node: process.version,
  proxyFlags, maximumPairedCycles: 30, deadlineMs: 20000,
  preset: 'public-default-province-center', targets: targets.map(t => ({ target: t.target, host: t.url.hostname })),
  scope: 'Native HTTPS diagnostic; no credentials, response bodies/headers, IPs or personal coordinates retained. Separate connections are not proof of browser route equivalence.' });
const started = performance.now(), abort = new AbortController();
let done = false, cycles = 0, strictExit = null, childError = null;
const child = spawn('npx', ['playwright', 'test', '--config', 'qa-provider-v03/playwright.config.ts', '--grep', 'LIVE'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WW_DIAG_CONTROL: '1', WW_DIAG_SIGNALS: '', WW_DIAG_PUBLIC_URL: '' },
});
const logWrites = [];
for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { process.stdout.write(bytes); logWrites.push(appendFile(resolve(output, 'strict-live.log'), bytes)); });
const terminal = new Promise(resolveExit => {
  child.once('error', () => { childError = 'SPAWN_ERROR'; done = true; abort.abort(); resolveExit(); });
  child.once('close', code => { strictExit = code; done = true; abort.abort(); resolveExit(); });
});
await write({ type: 'browser-start', wallTime: new Date().toISOString(), monotonicElapsedMs: performance.now() - started });
while (!done && cycles < 30) {
  cycles++;
  await write({ type: 'cycle-start', cycle: cycles, wallTime: new Date().toISOString(), monotonicElapsedMs: performance.now() - started });
  const results = await Promise.all(targets.map(t => probe(t.url, { target: t.target, cycle: cycles, deadlineMs: 20000, signal: abort.signal })));
  for (const result of results) await write({ type: 'probe', ...result });
  if (!done) await new Promise(resolveDelay => {
    const finish = () => { clearTimeout(timer); abort.signal.removeEventListener('abort', finish); resolveDelay(); };
    const timer = setTimeout(finish, 5000); abort.signal.addEventListener('abort', finish, { once: true });
  });
}
await terminal;
await Promise.all(logWrites);
await write({ type: 'stop', wallTime: new Date().toISOString(), cycles, strictExit, childError, monotonicElapsedMs: performance.now() - started });
await writeFile(resolve(output, 'exit-status.json'), JSON.stringify({ strictExit, childError, pairedCycles: cycles,
  meaning: 'Strict exit is the original test gate; OS outcome must be read per probe, never inferred from process exit.' }, null, 2) + '\n');
process.exitCode = childError || strictExit === null ? 2 : strictExit;
