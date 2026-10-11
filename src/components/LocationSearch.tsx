import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Star, Navigation, ArrowUpRight } from "lucide-react";
import type { Location } from "../locations/types";
import { chinaCities } from "../locations/types";
import { localSearch } from "../locations/region";
import { searchPlaces } from "../providers/geocoding";
import { Modal } from "./Modal";
export function LocationSearch({
  onClose,
  onSelect,
  favorites,
  onLocate,
}: {
  onClose: () => void;
  onSelect: (l: Location) => void;
  favorites: Location[];
  onLocate: () => void;
}) {
  const [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 450);
    return () => clearTimeout(id);
  }, [query]);
  const remote = useQuery({
    queryKey: ["places", debounced],
    queryFn: ({ signal }) => searchPlaces(debounced, signal),
    enabled: debounced.trim().length >= 2,
    staleTime: 86400000,
  });
  const select = (l: Location) => {
    onSelect(l);
    onClose();
  };
  const local = localSearch(query);
  return (
    <Modal title="เลือกตำแหน่ง" onClose={onClose}>
      <label className="search-field">
        <Search size={20} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="จังหวัด อำเภอ หรือเมืองในไทย"
          aria-label="ค้นหาตำแหน่ง"
        />
      </label>
      <button
        className="location-use"
        onClick={() => {
          onLocate();
          onClose();
        }}
      >
        <Navigation size={17} /> ใช้ตำแหน่งของฉัน
      </button>
      <div className="search-results">
        {!query && favorites.length > 0 && (
          <>
            <h3>
              <Star size={15} /> ตำแหน่งโปรด
            </h3>
            {favorites.map((l) => (
              <button className="result" key={l.id} onClick={() => select(l)}>
                <Star size={17} />
                <span>
                  {l.name}
                  <small>{l.english}</small>
                </span>
              </button>
            ))}
          </>
        )}
        <h3>
          ประเทศไทย <span>{local.length} / 77 จังหวัด</span>
        </h3>
        {local.length ? (
          local.map((l) => (
            <button className="result" key={l.id} onClick={() => select(l)}>
              <MapPin size={17} />
              <span>
                {l.name}
                <small>{l.english} · จุดศูนย์กลางเมือง</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))
        ) : (
          <p className="muted">
            ไม่พบในรายชื่อจังหวัด ลองผลค้นหาสถานที่ด้านล่างหรือแตะจุดบนแผนที่
          </p>
        )}
        {query.length >= 2 && (
          <>
            <h3>
              สถานที่เพิ่มเติม <span>GeoNames</span>
            </h3>
            {remote.isFetching ? (
              <p className="muted" role="status">
                กำลังค้นหาสถานที่…
              </p>
            ) : remote.isError ? (
              <p role="status" className="muted">
                ค้นหาออนไลน์ไม่ได้ รายชื่อจังหวัดยังใช้งานได้
              </p>
            ) : remote.data?.length ? (
              remote.data.map((l) => (
                <button className="result" key={l.id} onClick={() => select(l)}>
                  <MapPin size={17} />
                  <span>
                    {l.name}
                    <small>{l.english}</small>
                  </span>
                </button>
              ))
            ) : (
              <p className="muted">
                ไม่พบชื่อในฐานข้อมูล ลองชื่อภาษาอังกฤษหรือเลือกบนแผนที่
              </p>
            )}
          </>
        )}
        {!query && (
          <>
            <h3>
              เมืองเสริมในจีน <span>3 เมือง</span>
            </h3>
            <div className="china-options">
              {chinaCities.map((l) => (
                <button key={l.id} onClick={() => select(l)}>
                  <span>🇨🇳</span>
                  {l.name}
                  <small>{l.english}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="search-note">
        รายชื่อจังหวัดใช้ได้แม้ค้นหาออนไลน์ล้มเหลว
        ฐานข้อมูลอาจไม่ครอบคลุมทุกอำเภอหรือหมู่บ้าน •{" "}
        <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
          GeoNames
        </a>
      </p>
    </Modal>
  );
}
