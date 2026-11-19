import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
/** One designed pattern for empty / error / offline / retry states: tinted icon, title, optional body and action. */
export function StateBlock(p: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: "neutral" | "warn" | "bad";
  compact?: boolean;
  role?: "status" | "alert";
}) {
  const Icon = p.icon;
  return (
    <div className={`ww-state ${p.compact ? "is-compact" : ""}`} data-tone={p.tone ?? "neutral"} role={p.role}>
      <span className="ww-state-ico" aria-hidden="true"><Icon size={p.compact ? 16 : 20} /></span>
      <span className="ww-state-text">
        <strong>{p.title}</strong>
        {p.body && <small>{p.body}</small>}
      </span>
      {p.action && <span className="ww-state-act">{p.action}</span>}
    </div>
  );
}
