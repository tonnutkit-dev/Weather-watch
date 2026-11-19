import { Component } from "react";
import type { ReactNode } from "react";
import { MapPinOff } from "lucide-react";
import { useI18n } from "../i18n/i18n";
import { StateBlock } from "./StateBlock";
function MapFailed() {
  const { t } = useI18n();
  return (
    <div className="map-status">
      <StateBlock icon={MapPinOff} tone="bad" compact role="alert" title={t("map.error")} body={t("map.errorBody")}
        action={<button className="ww-btn" onClick={() => window.location.reload()}>{t("map.reload")}</button>} />
    </div>
  );
}
export class MapBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <MapFailed /> : this.props.children;
  }
}
