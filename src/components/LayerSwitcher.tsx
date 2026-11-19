import { CloudRain, Thermometer, Wind } from "lucide-react";
import { useI18n } from "../i18n/i18n";
export type Mode = "radar" | "temp" | "air";
const items = [
  ["radar", "layer.radar", CloudRain],
  ["temp", "layer.temp", Thermometer],
  ["air", "layer.air", Wind],
] as const;
export function LayerSwitcher({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  const { t } = useI18n();
  return (
    <div className="ww-seg glass" role="radiogroup" aria-label={t("layer.group")}>
      {items.map(([id, key, Icon]) => (
        <button
          key={id}
          role="radio"
          aria-checked={mode === id}
          className={mode === id ? "on" : ""}
          data-layer={id}
          onClick={() => onMode(id)}
        >
          <Icon size={17} aria-hidden="true" />
          {t(key)}
        </button>
      ))}
    </div>
  );
}
