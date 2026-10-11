const url = "https://tonnutkit-dev.github.io/Weather-watch/";
const expected = process.env.GITHUB_SHA;
if (!expected)
  throw new Error("GITHUB_SHA is required to verify deployed source");
let last;
for (let attempt = 0; attempt < 12; attempt++) {
  try {
    const response = await fetch(`${url}release.json?commit=${expected}`, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Release manifest HTTP ${response.status}`);
    const release = await response.json();
    if (release.commit !== expected)
      throw new Error(
        `Deployed SHA ${release.commit} differs from ${expected}`,
      );
    const html = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!html.ok || !(await html.text()).includes("/Weather-watch/assets/"))
      throw new Error("Project HTML/assets unavailable");
    console.log(`Verified real HTTPS site and release ${expected}: ${url}`);
    process.exit(0);
  } catch (error) {
    last = error;
  }
  if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 3000));
}
throw last;
