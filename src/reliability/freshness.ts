/** Source timestamps are Unix seconds. A successful fetch cannot renew source validity. */
export const SOURCE_LIMIT = { weather: 7200, air: 10800 } as const;
export const REFRESH_INTERVAL = 600000;
export const MANUAL_COOLDOWN = 30000;
export type FreshnessKind = 'fresh' | 'cached' | 'expired' | 'refreshing' | 'refresh-failed' | 'unavailable';
export function freshness(sourceTime: number | null | undefined, fetchedAt: number | undefined,
  kind: keyof typeof SOURCE_LIMIT, fetching = false, failed = false, now = Date.now()) {
  const sourceUsable = sourceTime != null && Number.isFinite(sourceTime) &&
    sourceTime * 1000 <= now + 300000 && now - sourceTime * 1000 < SOURCE_LIMIT[kind] * 1000;
  const expired = sourceTime != null && now - sourceTime * 1000 >= SOURCE_LIMIT[kind] * 1000;
  const state: FreshnessKind = sourceTime == null ? 'unavailable' : expired ? 'expired' :
    failed ? 'refresh-failed' : fetching ? 'refreshing' : !sourceUsable ? 'unavailable' :
      fetchedAt != null && now - fetchedAt * 1000 < REFRESH_INTERVAL ? 'fresh' : 'cached';
  return { state, sourceUsable, assessmentAllowed: sourceUsable && !failed,
    failed, fetching, expiresAt: sourceTime == null ? null : (sourceTime + SOURCE_LIMIT[kind]) * 1000 };
}
export const freshnessLabel: Record<FreshnessKind, string> = {
  fresh: 'ข้อมูลอยู่ในช่วงใช้งาน', cached: 'ข้อมูลที่เก็บไว้ ยังใช้ประเมินได้',
  expired: 'ข้อมูลหมดอายุ · ยังประเมินไม่ได้', refreshing: 'กำลังอัปเดต · ค่ายังเป็นข้อมูลเดิม',
  'refresh-failed': 'อัปเดตไม่สำเร็จ · แสดงข้อมูลเดิม', unavailable: 'ไม่มีข้อมูลปัจจุบันที่ใช้ประเมินได้',
};
/** Per-location admission gate. Failed requests and retries do not evade the cooldown. */
export class RefreshGate {
  private attempts = new Map<string, number>();
  record(key: string, now = Date.now()) {
    this.attempts.delete(key); this.attempts.set(key, now);
    if (this.attempts.size > 128) this.attempts.delete(this.attempts.keys().next().value!);
  }
  allow(key: string, manual: boolean, now = Date.now()) {
    return now - (this.attempts.get(key) ?? -Infinity) >= (manual ? MANUAL_COOLDOWN : REFRESH_INTERVAL);
  }
}
