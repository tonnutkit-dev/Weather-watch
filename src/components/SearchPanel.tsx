import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Star, Navigation, X, SearchX, WifiOff } from "lucide-react";
import type { Location } from "../locations/types";
import { chinaCities } from "../locations/types";
import { localSearch } from "../locations/region";
import { searchPlaces } from "../providers/geocoding";
import { useI18n } from "../i18n/i18n";
import { useExit } from "../app/useExit";
import { StateBlock } from "./StateBlock";

/** One-handed search: the field sits in the thumb zone, results stack upward. */
export function SearchPanel(p: { onClose: () => void; onSelect: (l: Location) => void; favorites: Location[]; onLocate: () => void }) {
  const { t, placeName, placeSub } = useI18n();
  const [query, setQuery] = useState(""), [debounced, setDebounced] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [closing, close] = useExit(p.onClose);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { const id = setTimeout(() => setDebounced(query), 450); return () => clearTimeout(id); }, [query]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [close]);
  const remote = useQuery({
    queryKey: ["places", debounced],
    queryFn: ({ signal }) => searchPlaces(debounced, signal),
    enabled: debounced.trim().length >= 2,
    staleTime: 86400000,
  });
  const pick = (l: Location) => { p.onSelect(l); close(); };
  const q = query.trim().toLowerCase();
  const local = q ? localSearch(query).slice(0, 8) : [];
  const china = chinaCities.filter((c) => !q || `${c.name} ${c.english}`.toLowerCase().includes(q));
  const row = (l: Location, icon: ReactNode, sub?: string) => (
    <button className="ww-row" key={l.id} onClick={() => pick(l)}>
      <span className="ww-row-ico">{icon}</span>
      <span className="ww-row-text"><b>{placeName(l)}</b><small>{sub ?? placeSub(l)}</small></span>
    </button>
  );
  return (
    <div className={`ww-search ${closing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={t("search.open")}>
      <div className="ww-scrim" onClick={close} />
      <div className="ww-search-col">
        <div className="ww-results glass" role="list">
          {!q && p.favorites.length > 0 && (<><h3>{t("search.favorites")}</h3>{p.favorites.map((l) => row(l, <Star size={16} />))}</>)}
          {q && (<>
            <h3>{t("search.provinces")} <span>{local.length}</span></h3>
            {local.map((l) => row(l, <MapPin size={16} />, [placeSub(l), t("search.center")].filter(Boolean).join(" · ")))}
          </>)}
          {china.length > 0 && (<><h3>{t("search.china")}</h3>{china.map((l) => row(l, <MapPin size={16} />))}</>)}
          {q.length >= 2 && (<>
            <h3>{t("search.places")} <span>GeoNames</span></h3>
            {remote.isFetching ? <p className="ww-muted ww-searching" role="status"><span className="ww-spin" aria-hidden="true" /> {t("search.searching")}</p>
              : remote.isError ? <StateBlock compact icon={WifiOff} tone="warn" role="status" title={t("search.remoteError")} />
              : remote.data?.length ? remote.data.map((l) => row(l, <MapPin size={16} />))
              : !local.length ? <StateBlock compact icon={SearchX} title={t("search.none")} /> : null}
          </>)}
          <button className="ww-row ww-row-locate" onClick={() => { p.onLocate(); close(); }}>
            <span className="ww-row-ico"><Navigation size={16} /></span>
            <span className="ww-row-text"><b>{t("search.locate")}</b></span>
          </button>
        </div>
        <label className="ww-input glass">
          <Search size={19} aria-hidden="true" />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search.placeholder")} aria-label={t("search.open")} enterKeyHint="search" />
          <button type="button" className="ww-icon-btn" aria-label={query ? t("search.clear") : t("search.close")} onClick={() => (query ? setQuery("") : close())}>
            <X size={17} />
          </button>
        </label>
      </div>
    </div>
  );
}
