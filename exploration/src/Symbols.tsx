import { useId } from 'react';
export function BrandMark() {
    return <svg viewBox="0 0 36 36" aria-hidden="true" className="brand-mark"><rect x="1" y="1" width="34" height="34" rx="12" fill="currentColor"/><path d="M8 20c3-5 5 5 9 0s6 5 11 0M8 25c3-4 5 4 9 0s6 4 11 0" fill="none" stroke="var(--on-accent)" strokeWidth="1.8" strokeLinecap="round"/><circle cx="22" cy="12" r="3.5" fill="var(--on-accent)"/></svg>;
}
export function WeatherArt({ small = false, rain = false }: {
    small?: boolean;
    rain?: boolean;
}) {
    const id = useId().replace(/:/g, '');
    return <svg viewBox="0 0 140 125" className={small ? 'weather-art small' : 'weather-art'} aria-hidden="true">
    <defs><linearGradient id={`${id}-cloud`} x1="0" y1="0" x2=".2" y2="1"><stop stopColor="var(--cloud-top)"/><stop offset="1" stopColor="var(--cloud-bottom)"/></linearGradient><linearGradient id={`${id}-sun`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#efcf7c"/><stop offset="1" stopColor="#d7a75b"/></linearGradient></defs>
    {!rain && <><circle cx="88" cy="42" r="25" fill={`url(#${id}-sun)`}/><circle cx="88" cy="42" r="32" fill="none" stroke="var(--sun-ring)" strokeWidth=".7"/></>}
    <path d="M31 91c-14 0-21-9-21-20 0-11 9-20 21-20h1c4-17 14-26 31-26 18 0 29 12 31 28 13-3 31 5 31 19 0 12-9 19-24 19Z" fill={`url(#${id}-cloud)`}/>
    <path d="M31 51c4-17 14-26 31-26 18 0 29 12 31 28" fill="none" stroke="var(--cloud-edge)" strokeWidth="1.2"/>
    {rain && <g stroke="var(--accent)" strokeWidth="4" strokeLinecap="round"><path d="m39 102-4 8m28-8-4 8m28-8-4 8"/></g>}
  </svg>;
}
export function ForecastChart() {
    return <div className="forecast-chart" role="img" aria-label="กราฟตัวอย่าง: อุณหภูมิลดจาก 31 เป็น 27 องศาในหกชั่วโมง โอกาสฝนสูงสุด 70 เปอร์เซ็นต์ เวลา 17 นาฬิกา">
    <svg viewBox="0 0 500 85" preserveAspectRatio="none" aria-hidden="true"><path className="chart-grid" d="M0 15H500M0 50H500M0 84H500"/><path className="chart-rain" d="M5 78V64M103 78V51M201 78V35M299 78V31M397 78V41M495 78V58"/><path className="chart-line" d="M5 14C51 14 67 25 103 27S168 40 201 41 260 55 299 57 355 57 397 57 455 72 495 72"/></svg>
  </div>;
}
