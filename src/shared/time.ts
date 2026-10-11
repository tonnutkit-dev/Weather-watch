export function timeLabel(
  epoch: number | null | undefined,
  timezone: string,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
) {
  if (epoch == null || !Number.isFinite(epoch)) return "ไม่ระบุเวลา";
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    ...options,
    timeZone: timezone,
  }).format(new Date(epoch * 1000));
}
// Epoch daily boundaries are local midnight; add provider UTC offset before formatting in UTC.
export function dayLabel(
  epoch: number,
  offset: number,
  options: Intl.DateTimeFormatOptions = { weekday: "short" },
) {
  return timeLabel(epoch + offset, "UTC", options);
}
export const value = (n: number | null | undefined, digits = 0) =>
  n == null || !Number.isFinite(n) ? "—" : n.toFixed(digits);
export const windDirection = (n: number | null) =>
  n === null
    ? "—"
    : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(n / 45) % 8]!;
