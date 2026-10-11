export type Direction = 'a' | 'b' | 'c';
export type Theme = 'light' | 'dark';
export type Sheet = 'collapsed' | 'half' | 'expanded';
export const directions = {
    a: { title: 'Editorial Calm', subtitle: 'ความนิ่งที่มีรายละเอียด', label: 'A', name: 'PREMIUM EDITORIAL CALM' },
    b: { title: 'Atmospheric Map', subtitle: 'เข้าใจอากาศผ่านพื้นที่', label: 'B', name: 'ATMOSPHERIC MAP PREMIUM' },
    c: { title: 'The Weather Edit', subtitle: 'มองอากาศอย่างมีมุมมอง', label: 'C', name: 'SIGNATURE HYBRID' },
} as const;
export const demo = {
    date: '11 ตุลาคม 2569', time: '14:20', temperature: 31, feels: 34, high: 33, low: 26,
    condition: 'มีเมฆเป็นส่วนมาก', humidity: 68, wind: 12, pm25: 18, usAqi: 62,
    hours: [
        { time: 'ตอนนี้', temperature: 31, rain: 20, condition: 'cloud' },
        { time: '15:00', temperature: 30, rain: 40, condition: 'cloud' },
        { time: '16:00', temperature: 29, rain: 65, condition: 'rain' },
        { time: '17:00', temperature: 28, rain: 70, condition: 'rain' },
        { time: '18:00', temperature: 28, rain: 55, condition: 'rain' },
        { time: '19:00', temperature: 27, rain: 30, condition: 'cloud' },
    ],
    days: [
        { label: 'วันนี้', low: 26, high: 33, rain: 65 },
        { label: 'จันทร์', low: 26, high: 32, rain: 55 },
        { label: 'อังคาร', low: 25, high: 32, rain: 40 },
    ],
} as const;
export const demoLocations = [
    { name: 'กรุงเทพมหานคร', country: 'TH', zone: 'Asia/Bangkok', lat: 13.7563, lon: 100.5018 },
    { name: 'เชียงใหม่', country: 'TH', zone: 'Asia/Bangkok', lat: 18.7883, lon: 98.9853 },
    { name: 'ซีอาน', country: 'CN', zone: 'Asia/Shanghai', lat: 34.3416, lon: 108.9398 },
    { name: 'เฉิงตู', country: 'CN', zone: 'Asia/Shanghai', lat: 30.5728, lon: 104.0668 },
    { name: 'ฉงชิ่ง', country: 'CN', zone: 'Asia/Shanghai', lat: 29.5630, lon: 106.5516 },
] as const;
export type DemoLocation = typeof demoLocations[number];
export const frameLabel = (index: number) => `14:${String(index * 10).padStart(2, '0')}`;
export function nextFrame(index: number) { return (index + 1) % 3; }
export function nextSheet(sheet: Sheet, delta: number): Sheet {
    const states: Sheet[] = ['collapsed', 'half', 'expanded'];
    return states[Math.max(0, Math.min(2, states.indexOf(sheet) + delta))] ?? 'collapsed';
}
