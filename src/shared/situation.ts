import type { Weather } from "../weather/types";
import type { AirQuality } from "../air-quality/types";
export type Verdict = "Calm" | "Notable" | "Attention" | "Unknown";
export function situation(
  weather: Weather | undefined,
  air: AirQuality | undefined,
  now = Date.now() / 1000,
): { verdict: Verdict; title: string; reason: string } {
  if (
    !weather ||
    !air ||
    weather.current.temperature === null ||
    weather.current.apparent === null ||
    weather.current.wind === null ||
    air.aqi === null ||
    weather.current.time === null ||
    air.time === null ||
    now - weather.current.time >= 7200 ||
    now - air.time >= 10800
  )
    return {
      verdict: "Unknown",
      title: "ข้อมูลยังไม่ครบสำหรับประเมิน",
      reason:
        "รอข้อมูลอากาศและคุณภาพอากาศที่เป็นปัจจุบัน ข้อมูลเตือนภัยและน้ำท่วมยังไม่เชื่อมต่อ",
    };
  const next = weather.hourly.filter(
    (h) => h.time >= now && h.time < now + 6 * 3600,
  );
  if (
    next.length < 2 ||
    next.some((h) => h.probability === null || h.precipitation === null)
  )
    return {
      verdict: "Unknown",
      title: "ข้อมูลพยากรณ์ยังไม่ครบ",
      reason: "ยังประเมินแนวโน้มช่วงถัดไปไม่ได้ กรุณาตรวจแหล่งทางการเพิ่มเติม",
    };
  const probability = Math.max(...next.map((h) => h.probability!)),
    rain = Math.max(...next.map((h) => h.precipitation!));
  if (
    air.aqi > 150 ||
    weather.current.apparent >= 40 ||
    weather.current.wind >= 50 ||
    rain >= 10
  )
    return {
      verdict: "Attention",
      title: "ควรใส่ใจสภาพอากาศ",
      reason:
        air.aqi > 150
          ? "US AQI จากแบบจำลองสูง ควรพิจารณาลดกิจกรรมกลางแจ้ง"
          : weather.current.apparent >= 40
            ? "อุณหภูมิรู้สึกจากแบบจำลองสูง ควรพักและดื่มน้ำ"
            : rain >= 10
              ? "แบบจำลองคาดฝนค่อนข้างมากในช่วง 6 ชั่วโมงข้างหน้า"
              : "แบบจำลองประเมินลมแรง",
    };
  if (
    air.aqi > 100 ||
    weather.current.apparent >= 35 ||
    probability >= 60 ||
    rain >= 2.5
  )
    return {
      verdict: "Notable",
      title: "มีสภาพอากาศที่ควรติดตาม",
      reason:
        probability >= 60
          ? "โอกาสฝนเพิ่มใน 6 ชั่วโมงข้างหน้า เตรียมร่มก่อนออกเดินทาง"
          : air.aqi > 100
            ? "คุณภาพอากาศจากแบบจำลองอาจกระทบกลุ่มอ่อนไหว"
            : "อากาศร้อนหรือมีฝนในแบบจำลอง ควรวางแผนกิจกรรม",
    };
  return {
    verdict: "Calm",
    title: "แบบจำลองยังไม่ถึงเกณฑ์เฝ้าระวัง",
    reason:
      "ประเมินเฉพาะอากาศและ US AQI ไม่ยืนยันความปลอดภัย น้ำท่วม หรือประกาศทางการ",
  };
}
