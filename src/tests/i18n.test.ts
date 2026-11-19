import { describe, it, expect } from "vitest";
import { allKeys, raw, translate } from "../i18n/strings";
const thai = /[\u0E00-\u0E7F]/;
describe("UI strings", () => {
  it("every key has Thai, English and Chinese text", () => {
    for (const key of allKeys) for (const lang of ["th", "en", "zh"] as const) expect(raw(lang, key), `${lang}:${key}`).not.toBe("");
  });
  it("English and Chinese never fall back to Thai", () => {
    for (const key of allKeys) {
      expect(raw("en", key), key).not.toMatch(thai);
      expect(raw("zh", key), key).not.toMatch(thai);
    }
  });
  it("placeholders survive translation", () => {
    for (const key of allKeys) {
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(vars(raw("en", key)), key).toBe(vars(raw("th", key)));
      expect(vars(raw("zh", key)), key).toBe(vars(raw("th", key)));
    }
    expect(translate("zh", "h.dust", { kw: "AQI 157" })).toContain("AQI 157");
  });
});
