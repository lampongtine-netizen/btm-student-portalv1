"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { PriorityLevel, PriorityStatus } from "@/lib/data/types";
import { LEVEL_PRIORITY_LABEL, STATUS_LABEL } from "@/lib/format";
import { Icon } from "./Icon";

export function Loading({ rows = 2 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const notWired = error.message.startsWith("NOT_WIRED");
  return (
    <div className="form-error" role="alert">
      {notWired
        ? "This section isn't connected to the database yet. It will work once the live data connection is wired."
        : "Something went wrong loading this section."}
      {onRetry && !notWired && (
        <>
          {" "}
          <button type="button" className="link-arrow" style={{ border: 0, background: "none", color: "inherit" }} onClick={onRetry}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: PriorityStatus }) {
  const cls = status === "completed" ? "pill pill--done" : status === "in_progress" ? "pill pill--progress" : "pill";
  return <span className={cls}>{STATUS_LABEL[status]}</span>;
}

export function LevelPill({ level }: { level: PriorityLevel }) {
  return <span className={level === "high" ? "pill pill--high" : "pill"}>{LEVEL_PRIORITY_LABEL[level]}</span>;
}

export function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__panel">
        <div className="modal__head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 style={{ marginTop: 8 }}>{title}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3200);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
  return { show: setMsg, node };
}

export function PageHead({ eyebrow, title, intro, action }: { eyebrow: string; title: string; intro?: string; action?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {action}
    </header>
  );
}
