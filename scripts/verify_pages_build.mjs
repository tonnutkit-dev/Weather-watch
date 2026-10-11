import { readFile, writeFile, access, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";

const base = "/Weather-watch/";
const root = resolve("dist");
const html = await readFile(resolve(root, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
for (const ref of refs) {
  if (/^(https?:|data:|#)/.test(ref)) continue;
  if (!ref.startsWith(base))
    throw new Error(`Asset outside Pages base path: ${ref}`);
  const asset = resolve(root, ref.slice(base.length));
  if (relative(root, asset).startsWith(".."))
    throw new Error("Unsafe asset path");
  await access(asset);
}
const files = await readdir(resolve(root, "assets"));
if (!files.some((f) => /maplibre-gl-worker.*\.mjs$/.test(f)))
  throw new Error("Map worker missing");
if (!files.some((f) => /noto-sans-thai-thai.*\.woff2$/.test(f)))
  throw new Error("Local Thai font missing");
const sha =
  process.env.GITHUB_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
await writeFile(
  resolve(root, "release.json"),
  JSON.stringify(
    {
      project: "Weather Watch",
      version: "0.1.0",
      commit: sha,
      base,
      site: "https://tonnutkit-dev.github.io/Weather-watch/",
      builtAt: new Date().toISOString(),
      channel: "public-qa",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Pages build verified: ${refs.length} entry assets, worker/font present, base ${base}, commit ${sha}`,
);
