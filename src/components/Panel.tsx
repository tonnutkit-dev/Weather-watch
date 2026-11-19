import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useI18n } from "../i18n/i18n";
/** Floating glass panel used for settings and radar details. Escape and backdrop close it. */
export function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="ww-panel-layer">
      <div className="ww-scrim" onClick={onClose} />
      <div ref={box} className="ww-panel glass" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="ww-panel-head">
          <h2>{title}</h2>
          <button className="ww-icon-btn" aria-label={t("panel.close")} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="ww-panel-body">{children}</div>
      </div>
    </div>
  );
}
