export interface Location {
  id: string;
  name: string;
  english?: string;
  latitude: number;
  longitude: number;
  country: "TH" | "CN";
  timezone: "Asia/Bangkok" | "Asia/Shanghai";
  provinceId?: string;
  kind: "province" | "city" | "place" | "coordinates" | "geolocation";
}
export const chinaCities: Location[] = [
  {
    id: "cn-xian",
    name: "ซีอาน",
    english: "Xi’an · 西安",
    latitude: 34.2658,
    longitude: 108.9541,
    country: "CN",
    timezone: "Asia/Shanghai",
    kind: "city",
  },
  {
    id: "cn-chengdu",
    name: "เฉิงตู",
    english: "Chengdu · 成都",
    latitude: 30.5728,
    longitude: 104.0668,
    country: "CN",
    timezone: "Asia/Shanghai",
    kind: "city",
  },
  {
    id: "cn-chongqing",
    name: "ฉงชิ่ง",
    english: "Chongqing · 重庆",
    latitude: 29.563,
    longitude: 106.5516,
    country: "CN",
    timezone: "Asia/Shanghai",
    kind: "city",
  },
];
