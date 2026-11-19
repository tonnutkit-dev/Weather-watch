import { RefreshCw } from "lucide-react";
import { useI18n } from "../i18n/i18n";
import { LANGS } from "../i18n/strings";
import type { Appearance } from "../shared/preferences";
import type { GlassPref } from "../app/glass";
import { Panel } from "./Panel";

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset className="ww-choice">
      <legend>{label}</legend>
      <div>
        {options.map(([id, text]) => (
          <button key={id} aria-pressed={value === id} className={value === id ? "on" : ""} onClick={() => onChange(id)}>{text}</button>
        ))}
      </div>
    </fieldset>
  );
}
export function SettingsPanel(p: {
  onClose: () => void;
  appearance: Appearance;
  onAppearance: (a: Appearance) => void;
  glass: GlassPref;
  onGlass: (g: GlassPref) => void;
  onRefresh: () => void;
}) {
  const { t, lang, setLang } = useI18n();
  return (
    <Panel title={t("settings.title")} onClose={p.onClose}>
      <Choice label={t("settings.language")} value={lang} options={LANGS.map((l) => [l.id, l.label])} onChange={setLang} />
      <Choice label={t("settings.appearance")} value={p.appearance}
        options={[["dark", t("settings.dark")], ["light", t("settings.light")], ["system", t("settings.system")]]} onChange={p.onAppearance} />
      <Choice label={t("settings.glass")} value={p.glass}
        options={[["auto", t("settings.glassAuto")], ["solid", t("settings.glassSolid")]]} onChange={p.onGlass} />
      <button className="ww-btn" onClick={() => { p.onRefresh(); p.onClose(); }}>
        <RefreshCw size={16} /> {t("settings.refresh")}
      </button>
      <p className="ww-micro">{t("sheet.sourcesText")}</p>
    </Panel>
  );
}
