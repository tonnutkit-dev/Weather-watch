import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "../i18n/i18n";
import { useExit } from "../app/useExit";
/** Floating glass panel used for settings and radar details. Escape and backdrop close it. */
/** compact: at most ~half the viewport, body scrolls, footer stays visible, top chip stays uncovered. */
export function Panel({ title, onClose, children, footer, compact }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; compact?: boolean }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [closing, close] = useExit(onClose);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus?.();
    };
  }, [close]);
  // Portal: escape the dock/sheet stacking contexts so the panel always sits above them.
  return createPortal(
    <div className={`ww-panel-layer ${closing ? "is-closing" : ""}`}>
      <div className="ww-scrim" onClick={close} />
      <div ref={box} className={`ww-panel glass ${compact ? "is-compact" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="ww-panel-head">
          <h2>{title}</h2>
          <button className="ww-icon-btn" aria-label={t("panel.close")} onClick={close}>
            <X size={18} />
          </button>
        </div>
        <div className="ww-panel-body">{children}</div>
        {footer && <div className="ww-panel-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
