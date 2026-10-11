import { provinces } from "../locations/provinces";
import type { FloodWatch } from "./types";
export function unavailableFlood(provinceId: string): FloodWatch {
  return {
    provinceId,
    status: "data-unavailable",
    satellite: null,
    incidents: [],
    levels: [],
    discharge: null,
    reason:
      "ยังไม่ได้เชื่อมต่อข้อมูล GISTDA ที่ตรวจสอบสิทธิ์และเวลาแล้ว ไม่มีข้อมูลไม่ได้แปลว่าไม่มีน้ำท่วม",
  };
}
export const provinceFloodRegistry = Object.fromEntries(
  provinces.map((p) => [p.id, unavailableFlood(p.id)]),
);
