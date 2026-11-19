import { Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, CircleHelp, type LucideIcon } from "lucide-react";
/** WMO weather code → the same lucide line icon family used across the app, tinted per condition. */
export function weatherGlyph(code: number | null, isDay: boolean | null = true): { Icon: LucideIcon; tone: string } {
  if (code === null) return { Icon: CircleHelp, tone: "none" };
  if (code === 0) return isDay === false ? { Icon: Moon, tone: "night" } : { Icon: Sun, tone: "sun" };
  if (code <= 2) return isDay === false ? { Icon: CloudMoon, tone: "night" } : { Icon: CloudSun, tone: "sun" };
  if (code === 3) return { Icon: Cloud, tone: "cloud" };
  if (code === 45 || code === 48) return { Icon: CloudFog, tone: "cloud" };
  if (code >= 95) return { Icon: CloudLightning, tone: "storm" };
  if (code >= 71 && code <= 77) return { Icon: CloudSnow, tone: "snow" };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, tone: "rain" };
  if (code >= 51) return { Icon: CloudRain, tone: "rain" };
  return { Icon: Cloud, tone: "cloud" };
}
export function WeatherIcon({ code, isDay = true, size = 24 }: { code: number | null; isDay?: boolean | null; size?: number }) {
  const { Icon, tone } = weatherGlyph(code, isDay);
  return <Icon size={size} className="ww-wx" data-tone={tone} aria-hidden="true" />;
}
