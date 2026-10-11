import type { Provenance } from "../shared/provenance";
export interface OfficialAlert {
  id: string;
  authority: string;
  type: string;
  severity: string | null;
  affectedAreas: string[];
  issuedAt: number | null;
  validFrom: number | null;
  validTo: number | null;
  sourceUrl: string;
  originalContent: string;
  meta: Provenance;
}
// Unknown expiry is never silently classified active. Preserve official severity, do not map to app verdict.
export function activeAlerts(alerts: OfficialAlert[], now: number) {
  return alerts.filter(
    (a) =>
      a.validFrom !== null &&
      a.validTo !== null &&
      a.validFrom <= now &&
      a.validTo > now,
  );
}
export function alertFoundation(country: "TH" | "CN") {
  return country === "TH"
    ? {
        status: "unavailable" as const,
        authority: "กรมอุตุนิยมวิทยา",
        url: "https://www.tmd.go.th/warning-and-events/warning",
        reason:
          "ยังไม่ได้เชื่อมต่อประกาศอัตโนมัติ ตรวจสอบประกาศล่าสุดจากกรมอุตุนิยมวิทยา",
      }
    : {
        status: "unavailable" as const,
        authority: "China Meteorological Administration",
        url: "https://www.cma.gov.cn/",
        reason:
          "ยังไม่เชื่อมต่อประกาศทางการจีน ไม่มีการใช้ประกาศไทยกับตำแหน่งนี้",
      };
}
