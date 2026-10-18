import { useId } from "react";
export function condition(code: number | null) {
  if (code === null) return "ไม่มีข้อมูลสภาพอากาศ";
  if (code === 0) return "ท้องฟ้าแจ่มใส";
  if (code <= 2) return "มีเมฆบางส่วน";
  if (code === 3) return "มีเมฆมาก";
  if (code === 45 || code === 48) return "มีหมอก";
  if (code >= 95) return "มีโอกาสฝนฟ้าคะนอง";
  if (code >= 71 && code <= 77) return "หิมะตก";
  if (code >= 51) return "มีฝน";
  return "สภาพอากาศแปรปรวน";
}
export function WeatherIcon({
  code,
  isDay = true,
  size = 44,
}: {
  code: number | null;
  isDay?: boolean | null;
  size?: number;
}) {
  const id = useId().replace(/:/g, "");
  const rain = code !== null && code >= 51,
    snow = code !== null && code >= 71 && code <= 77,
    cloud = code !== null && code > 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className="weather-icon"
    >
      <defs><linearGradient id={`${id}-cloud`} x1="0" y1="0" x2="0.2" y2="1"><stop stopColor="var(--cloud-top)"/><stop offset="1" stopColor="var(--cloud-bottom)"/></linearGradient></defs>
      {code === null ? (
        <text x="29" y="50" fill="currentColor" fontSize="36">
          ?
        </text>
      ) : (
        <>
          {!rain &&
            (isDay ? (
              <>
                <g stroke="#f2bd4d" strokeWidth="3" strokeLinecap="round">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
                    <path
                      key={d}
                      d="M40 9v5"
                      transform={`rotate(${d} 40 34)`}
                    />
                  ))}
                </g>
                <circle cx="40" cy="34" r="16" fill="#ffd66d" />
              </>
            ) : (
              <path
                d="M50 15c-21-2-33 22-15 33 12 7 24-1 25-13-15 5-24-11-10-20Z"
                fill="#b6ceec"
              />
            ))}
          {cloud && (
            <>
              <path
                d="M24 56c-20 0-20-25-3-25 5-18 31-17 36 1 21-2 25 24 4 24H24Z"
                fill={`url(#${id}-cloud)`}
              />
              <path
                d="M24 56c-13 0-18-9-13-16 2 7 6 10 14 10h36c8 0 12-3 14-7 2 8-4 13-14 13H24Z"
                fill="var(--cloud-shade)"
              />
            </>
          )}
          {rain &&
            !snow &&
            [26, 42, 58].map((x) => (
              <path
                key={x}
                d={`m${x} 63-4 9`}
                stroke="var(--blue)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}
          {snow && (
            <text x="22" y="75" fontSize="19" fill="#69a6e5">
              ✦ ✦ ✦
            </text>
          )}
          {code !== null && code >= 95 && (
            <path d="m43 48-9 17h9l-4 12 16-20h-10l7-9Z" fill="#efb745" />
          )}
        </>
      )}
    </svg>
  );
}
